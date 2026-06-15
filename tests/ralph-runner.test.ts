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

function writeRealPkgTest(workspace: string, exitCode: number): void {
  fs.writeFileSync(
    path.join(workspace, "package.json"),
    JSON.stringify({
      scripts: {
        test: `node --eval "process.exit(${exitCode})"`,
      },
    }),
  );
}

function advanceToDev(engine: WorkflowEngine, slug: string): void {
  const dir = engine.changeDir(slug);
  const filler = "x".repeat(100);
  fs.writeFileSync(path.join(dir, "REQUIREMENT.md"), `# Requirement\n${filler}\n`);
  fs.writeFileSync(path.join(dir, "TASK.md"), `# Task\n${filler}\n`);
  const statePath = path.join(dir, "state.json");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
    currentPhase: string;
    completedPhases: string[];
  };
  state.currentPhase = "dev";
  state.completedPhases = ["change", "requirement"];
  fs.writeFileSync(statePath, JSON.stringify(state));
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
    advanceToDev(engine, "ralph-demo");
    writeRealPkgTest(workspace, 0);
    const r = runRalphVerify(engine, workspace, "ralph-demo");
    expect(r.ok).toBe(true);
    expect(r.verifyCmd).toBe("npm test");
    expect(r.exitCode).toBe(0);
    const changeDir = path.join(taiyiRoot, "changes", "ralph-demo");
    expect(readRalphState(changeDir)?.round ?? 0).toBe(0);
  });

  it("fails and bumps round when npm test exits non-zero", () => {
    advanceToDev(engine, "ralph-demo");
    writeRealPkgTest(workspace, 1);
    const r = runRalphVerify(engine, workspace, "ralph-demo");
    expect(r.ok).toBe(false);
    expect(r.exitCode).toBe(1);
    expect(r.round).toBeGreaterThanOrEqual(1);
    expect(r.text).toContain("Ralph 验证失败");
  });

  it("skips placeholder npm test and uses forge doctor when wrapper exists", () => {
    advanceToDev(engine, "ralph-demo");
    writePkgTest(workspace, 1);
    fs.mkdirSync(path.join(workspace, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(workspace, "scripts", "taiyi-forge.sh"), "#!/bin/bash\nexit 0\n", {
      mode: 0o755,
    });
    const r = runRalphVerify(engine, workspace, "ralph-demo");
    expect(r.verifyCmd).toBe("bash scripts/taiyi-forge.sh doctor");
  });

  it("returns not found for missing slug", () => {
    writeRealPkgTest(workspace, 0);
    const r = runRalphVerify(engine, workspace, "missing");
    expect(r.ok).toBe(false);
    expect(r.text).toContain("Change not found");
  });

  it("rejects unsafe TAIYI_RALPH_VERIFY_CMD", () => {
    advanceToDev(engine, "ralph-demo");
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

  it("skips verify before dev phase", () => {
    writeRealPkgTest(workspace, 0);
    const r = runRalphVerify(engine, workspace, "ralph-demo");
    expect(r.skipped).toBe(true);
    expect(r.skipReason).toBe("before-dev");
    expect(r.text).toContain("规划阶段");
  });
});
