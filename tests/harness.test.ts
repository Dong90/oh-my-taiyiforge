import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import {
  buildHarnessPlan,
  enforceAutoHarnessBeforeComplete,
  formatHarnessPlanPlain,
} from "../src/core/harness-runner.js";
import { markHarnessCheckpoint } from "../src/core/harness-checkpoints.js";
import { E2E_ARTIFACTS } from "../src/core/e2e-fixtures.js";

function writeChangeArtifact(dir: string, slug: string): void {
  fs.writeFileSync(path.join(dir, "CHANGE.md"), E2E_ARTIFACTS.change.replace(/E2E Demo/g, slug), "utf8");
}

const GATES = {
  quality: {
    completeness: true,
    consistency: true,
    verifiability: true,
    traceability: true,
    engineering_quality: true,
  },
  human: { approved: true, approver: "test" },
} as const;

describe("auto harness", () => {
  let root: string;
  let workspace: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-ws-"));
    root = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("init --auto sets autoHarness on state", () => {
    engine.initChange("auto1", { autoHarness: true });
    expect(engine.getState("auto1")?.autoHarness).toBe(true);
  });

  it("blocks complete in auto mode without harness checkpoints", () => {
    engine.initChange("auto2", { autoHarness: true });
    writeChangeArtifact(engine.changeDir("auto2"), "auto2");
    const state = engine.getState("auto2")!;
    const plan = buildHarnessPlan(workspace, root, state);
    expect(plan.blockers.length).toBeGreaterThan(0);
    expect(formatHarnessPlanPlain(plan)).toContain("铁三角");

    const r = engine.completePhase("auto2", "change", GATES);
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Auto harness");
  });

  it("allows complete after checkpoint and CONTEXT.md", () => {
    engine.initChange("auto3", { autoHarness: true });
    const dir = engine.changeDir("auto3");
    writeChangeArtifact(dir, "auto3");
    fs.writeFileSync(path.join(dir, "CONTEXT.md"), "# CONTEXT\n\n## Scan\nok\n", "utf8");
    markHarnessCheckpoint(dir, "change", "superpowers/brainstorming");

    const state = engine.getState("auto3")!;
    const check = enforceAutoHarnessBeforeComplete(workspace, root, state);
    expect(check.ok).toBe(true);

    const r = engine.completePhase("auto3", "change", GATES);
    expect(r.ok).toBe(true);
  });
});
