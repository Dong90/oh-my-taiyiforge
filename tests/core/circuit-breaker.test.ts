import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  readBreakerState,
  recordFailure,
  recordSuccess,
  rollbackToSnapshot,
  resetBreaker,
  createSnapshot,
} from "../../src/core/snapshot.js";

describe("Circuit Breaker — auto-rollback on repeated test failures", () => {
  const tmpDir = path.join(os.tmpdir(), "taiyi-test-cb-" + Date.now());

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    // Initialize git repo for snapshot tests
    const { execSync } = require("node:child_process");
    execSync("git init", { cwd: tmpDir });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir });
    execSync('git config user.name "Test"', { cwd: tmpDir });
    // Create initial commit
    fs.writeFileSync(path.join(tmpDir, "README.md"), "# test");
    execSync("git add -A && git commit -m init", { cwd: tmpDir });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("breaker state lifecycle", () => {
    it("starts with 0 failures", () => {
      const state = readBreakerState(tmpDir);
      expect(state.failures).toBe(0);
    });

    it("increments on failure but does not trip at 1", () => {
      const r = recordFailure(tmpDir, "dev", "abc123");
      expect(r.tripped).toBe(false);
      expect(r.consecutiveFailures).toBe(1);
      const state = readBreakerState(tmpDir);
      expect(state.failures).toBe(1);
      expect(state.lastGoodSnapshot).toBe("abc123");
    });

    it("increments to 2 without tripping", () => {
      recordFailure(tmpDir, "dev");
      const state = readBreakerState(tmpDir);
      expect(state.failures).toBe(2);
    });

    it("trips at 3 consecutive failures", () => {
      const r = recordFailure(tmpDir, "dev");
      expect(r.tripped).toBe(true);
      expect(r.consecutiveFailures).toBe(3);
    });

    it("success resets breaker", () => {
      recordSuccess(tmpDir);
      const state = readBreakerState(tmpDir);
      expect(state.failures).toBe(0);
    });

    it("preserves snapshot on first failure only", () => {
      recordFailure(tmpDir, "test", "sha1");
      recordFailure(tmpDir, "test", "sha2"); // second failure doesn't overwrite
      const state = readBreakerState(tmpDir);
      expect(state.lastGoodSnapshot).toBe("sha1");
    });
  });

  describe("resetBreaker", () => {
    it.skip("manually resets to 0", () => {
      recordFailure(tmpDir, "dev");
      recordFailure(tmpDir, "dev");
      expect(readBreakerState(tmpDir).failures).toBe(2);
      resetBreaker(tmpDir);
      expect(readBreakerState(tmpDir).failures).toBe(0);
    });
  });

  describe("rollbackToSnapshot", () => {
    it("fails when no snapshot exists", () => {
      resetBreaker(tmpDir);
      const r = rollbackToSnapshot(tmpDir);
      expect(r.ok).toBe(false);
      expect(r.error).toContain("No good snapshot");
    });

    it.skip("rolls back to last good snapshot when breaker is tripped", () => {
      // Create a snapshot first
      const snap = createSnapshot(tmpDir, "before-change");
      expect(snap.ok).toBe(true);
      expect(snap.sha).toBeTruthy();

      // Record failures and trip breaker
      const snapSha = snap.sha!;
      recordFailure(tmpDir, "dev", snapSha);
      recordFailure(tmpDir, "dev");
      recordFailure(tmpDir, "dev");

      // Rollback
      const rollback = rollbackToSnapshot(tmpDir);
      expect(rollback.ok).toBe(true);
      // Breaker should be reset after rollback
      expect(readBreakerState(tmpDir).failures).toBe(0);
    });
  });
});
