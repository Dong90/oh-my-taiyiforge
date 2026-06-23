import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Shadow Snapshot — auto-commit before each phase transition.
 * Circuit Breaker — auto-rollback on consecutive test failures.
 */

const SNAPSHOT_PREFIX = "taiyi-snapshot";

export type SnapshotResult = {
  ok: boolean;
  sha?: string;
  error?: string;
};

export type BreakerState = {
  failures: number;
  lastGoodSnapshot?: string;
  lastAttemptedPhase?: string;
};

const BREAKER_FILE = ".taiyi/breaker-state.json";

/** Create a shadow snapshot (git commit on a temp branch before risky operation). */
export function createSnapshot(repoRoot: string, label: string): SnapshotResult {
  try {
    const branchName = `${SNAPSHOT_PREFIX}-${label}-${Date.now()}`;
    // Stage all changes
    execSync("git add -A", { cwd: repoRoot, encoding: "utf8", timeout: 10000 });
    // Check if there are changes to commit
    const status = execSync("git diff --cached --quiet", { cwd: repoRoot, encoding: "utf8", timeout: 5000 });
    // Commit on a snapshot branch
    execSync(`git checkout -b ${branchName} 2>/dev/null || true`, { cwd: repoRoot, timeout: 5000 });
    execSync(`git commit -m "taiyi-snapshot: ${label}"`, { cwd: repoRoot, timeout: 10000 });
    const sha = execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8", timeout: 5000 }).trim();
    // Return to original branch
    execSync("git checkout - 2>/dev/null || true", { cwd: repoRoot, timeout: 5000 });
    return { ok: true, sha };
  } catch (e) {
    // No changes to snapshot is OK
    if (e instanceof Error && e.message.includes("nothing to commit")) {
      return { ok: true };
    }
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Read the circuit breaker state from disk. */
export function readBreakerState(repoRoot: string): BreakerState {
  const fp = path.join(repoRoot, BREAKER_FILE);
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch { return { failures: 0 }; }
}

/** Write the circuit breaker state to disk. */
function writeBreakerState(repoRoot: string, state: BreakerState): void {
  const fp = path.join(repoRoot, BREAKER_FILE);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(state, null, 2), "utf8");
}

/** Record a test failure. Returns true if breaker is tripped (needs rollback). */
export function recordFailure(repoRoot: string, phase: string, snapshotSha?: string): { tripped: boolean; consecutiveFailures: number } {
  const state = readBreakerState(repoRoot);
  state.failures++;
  state.lastAttemptedPhase = phase;
  if (snapshotSha && state.failures === 1) {
    state.lastGoodSnapshot = snapshotSha; // save on first failure
  }
  writeBreakerState(repoRoot, state);
  return { tripped: state.failures >= 3, consecutiveFailures: state.failures };
}

/** Record a test success. Resets the breaker counter. */
export function recordSuccess(repoRoot: string): void {
  writeBreakerState(repoRoot, { failures: 0 });
}

/** Rollback to the last good snapshot. */
export function rollbackToSnapshot(repoRoot: string): SnapshotResult {
  const state = readBreakerState(repoRoot);
  if (!state.lastGoodSnapshot) {
    return { ok: false, error: "No good snapshot to rollback to" };
  }
  try {
    execSync(`git reset --hard ${state.lastGoodSnapshot}`, { cwd: repoRoot, timeout: 10000 });
    execSync("git clean -fd", { cwd: repoRoot, timeout: 5000 });
    // Reset breaker
    writeBreakerState(repoRoot, { failures: 0 });
    return { ok: true, sha: state.lastGoodSnapshot };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Reset the breaker (e.g., after manual intervention). */
export function resetBreaker(repoRoot: string): void {
  writeBreakerState(repoRoot, { failures: 0 });
}
