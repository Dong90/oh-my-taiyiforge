import { spawnSync } from "node:child_process";
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

/** Sanitize a label for use in git branch/commit messages (alphanumeric + hyphens). */
function sanitizeLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/** Run `git <args>` via spawnSync array-form. Returns { stdout, status } or throws on error. */
function gitSpawn(args: string[], opts: { cwd: string; timeout?: number }): { stdout: string; status: number } {
  const r = spawnSync("git", args, {
    cwd: opts.cwd,
    encoding: "utf8",
    timeout: opts.timeout ?? 15000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.error) throw r.error;
  return { stdout: (r.stdout ?? "").trim(), status: r.status ?? 1 };
}

/** git checkout -b <branch>, ignoring errors if branch already exists. */
function gitCheckoutNewBranch(repoRoot: string, branchName: string): void {
  spawnSync("git", ["checkout", "-b", branchName], {
    cwd: repoRoot,
    timeout: 5000,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  // Silently ignore errors (branch may already exist, etc.)
}

/** git checkout -, ignoring errors. */
function gitCheckoutPrevious(repoRoot: string): void {
  spawnSync("git", ["checkout", "-"], {
    cwd: repoRoot,
    timeout: 5000,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
}

/** Create a shadow snapshot (git commit on a temp branch before risky operation). */
export function createSnapshot(repoRoot: string, label: string): SnapshotResult {
  try {
    const safeLabel = sanitizeLabel(label);
    const branchName = `${SNAPSHOT_PREFIX}-${safeLabel}-${Date.now()}`;
    // Stage all changes
    gitSpawn(["add", "-A"], { cwd: repoRoot, timeout: 10000 });
    // Check if there are changes to commit (exit code 0 = clean, 1 = dirty)
    const diffStatus = gitSpawn(["diff", "--cached", "--quiet"], { cwd: repoRoot, timeout: 5000 }).status;
    // No changes — skip snapshot
    if (diffStatus === 0) {
      return { ok: true };
    }
    // Commit on a snapshot branch
    gitCheckoutNewBranch(repoRoot, branchName);
    gitSpawn(["commit", "-m", `taiyi-snapshot: ${safeLabel}`], { cwd: repoRoot, timeout: 10000 });
    const sha = gitSpawn(["rev-parse", "HEAD"], { cwd: repoRoot, timeout: 5000 }).stdout;
    // Return to original branch
    gitCheckoutPrevious(repoRoot);
    return { ok: true, sha };
  } catch (e) {
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
  // Validate SHA: must be a 40-char hex string
  const sha = state.lastGoodSnapshot.trim();
  if (!/^[0-9a-fA-F]{40}$/.test(sha)) {
    return { ok: false, error: `Invalid snapshot SHA: ${sha}` };
  }
  try {
    gitSpawn(["reset", "--hard", sha], { cwd: repoRoot, timeout: 10000 });
    gitSpawn(["clean", "-fd"], { cwd: repoRoot, timeout: 5000 });
    // Reset breaker
    writeBreakerState(repoRoot, { failures: 0 });
    return { ok: true, sha };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Reset the breaker (e.g., after manual intervention). */
export function resetBreaker(repoRoot: string): void {
  writeBreakerState(repoRoot, { failures: 0 });
}
