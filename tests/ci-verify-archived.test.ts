import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { verifyWorkspaceCi } from "../src/core/ci-verify.js";

describe("ci-verify archived change", () => {
  let tmp: string;
  let taiyiRoot: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-verify-arch-"));
    taiyiRoot = path.join(tmp, ".taiyi");
    const archiveDir = path.join(taiyiRoot, "archive", "demo-lite");
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(
      path.join(archiveDir, "state.json"),
      JSON.stringify({
        slug: "demo-lite",
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
        autoHarness: true,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      }),
    );
    fs.writeFileSync(
      path.join(archiveDir, ".harness-checkpoints.json"),
      JSON.stringify({
        integration: ["superpowers/finishing-a-development-branch", "superpowers/verification-before-completion"],
      }),
    );
    fs.mkdirSync(path.join(tmp, ".taiyi", "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("passes verify for completed archived autoHarness change", () => {
    const report = verifyWorkspaceCi(tmp, taiyiRoot, { slug: "demo-lite" });
    expect(report.ok).toBe(true);
    expect(report.changes[0]?.blockers).toEqual([]);
  });
});
