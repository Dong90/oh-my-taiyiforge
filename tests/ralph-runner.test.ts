import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { runRalphVerify } from "../src/core/ralph-runner.js";
import { readRalphState } from "../src/core/ralph-state.js";

function writePkgTest(workspace: string, exitCode: number): void {
  fs.writeFileSync(
    path.join(workspace, "package.json"),
    JSON.stringify({
      scripts: {
        test: `node -e "process.exit(${exitCode})"`,
      },
    }),
  );
}

describe("ralph-runner", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-ralph-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
    engine.initChange("ralph-demo", { profile: "lite" });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("passes when npm test exits 0 and clears ralph state", () => {
    writePkgTest(workspace, 0);
    const r = runRalphVerify(engine, workspace, "ralph-demo");
    expect(r.ok).toBe(true);
    expect(r.verifyCmd).toBe("npm test");
    expect(r.exitCode).toBe(0);
    const changeDir = path.join(taiyiRoot, "changes", "ralph-demo");
    expect(readRalphState(changeDir)?.round ?? 0).toBe(0);
  });

  it("fails and bumps round when npm test exits non-zero", () => {
    writePkgTest(workspace, 1);
    const r = runRalphVerify(engine, workspace, "ralph-demo");
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(1);
    expect(r.round).toBeGreaterThanOrEqual(1);
    expect(r.text).toContain("Ralph 验证失败");
  });

  it("returns not found for missing slug", () => {
    writePkgTest(workspace, 0);
    const r = runRalphVerify(engine, workspace, "missing");
    expect(r.ok).toBe(false);
    expect(r.text).toContain("Change not found");
  });

  it("rejects unsafe TAIYI_RALPH_VERIFY_CMD", () => {
    fs.writeFileSync(path.join(workspace, "package.json"), JSON.stringify({ name: "ralph-unsafe" }));
    const prev = process.env.TAIYI_RALPH_VERIFY_CMD;
    process.env.TAIYI_RALPH_VERIFY_CMD = "npm test; rm -rf /";
    try {
      const r = runRalphVerify(engine, workspace, "ralph-demo");
      expect(r.ok).toBe(false);
      expect(r.skipped).toBe(true);
      expect(r.skipReason).toBe("unsafe-verify-cmd");
      expect(r.text).toContain("被拒绝");
    } finally {
      if (prev === undefined) delete process.env.TAIYI_RALPH_VERIFY_CMD;
      else process.env.TAIYI_RALPH_VERIFY_CMD = prev;
    }
  });
});
