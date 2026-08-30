import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  markHarnessEvidence,
  pendingDualLineHarnessHooks,
  readHarnessCheckpoints,
} from "../src/core/harness-checkpoints.js";

describe("harness evidence", () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-evidence-")); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("stores executable evidence metadata", () => {
    markHarnessEvidence(dir, "test", "ecc/test-coverage-analysis", {
      command: "npm test",
      exitCode: 0,
      capturedAt: "2026-08-30T00:00:00.000Z",
      inputFingerprint: "source-sha",
    });
    expect(readHarnessCheckpoints(dir).test?.["ecc/test-coverage-analysis"]).toMatchObject({
      passed: true,
      command: "npm test",
      exitCode: 0,
      inputFingerprint: "source-sha",
    });
  });

  it("does not treat legacy boolean checkpoints as fresh evidence", () => {
    fs.writeFileSync(path.join(dir, ".harness-checkpoints.json"), JSON.stringify({ test: { "ecc/security-scan": true } }));
    expect(pendingDualLineHarnessHooks(dir, "test", [{ tool: "ecc", skill: "security-scan", when: "scan" }], false))
      .toContain("ecc/security-scan");
  });
});
