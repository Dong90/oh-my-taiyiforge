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
import { markHarnessCheckpoint, pendingIronTriangleHooks } from "../src/core/harness-checkpoints.js";
import { getHarnessContext } from "../src/integrations/harness-hooks.js";
import { E2E_ARTIFACTS } from "../src/core/e2e-fixtures.js";
import { writeE2eArtifacts } from "../src/core/run-e2e-workflow.js";

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
    const mark = engine.markAuxiliary("auto3", "taiyi-intel-scan");
    expect(mark.ok, mark.error).toBe(true);

    const state = engine.getState("auto3")!;
    const check = enforceAutoHarnessBeforeComplete(workspace, root, state);
    expect(check.ok).toBe(true);

    const r = engine.completePhase("auto3", "change", GATES, { skipArtifactValidation: true });
    expect(r.ok).toBe(true);
  });

  it("complexity recommended skills only apply on their home phase", () => {
    engine.initChange("auto4", { autoHarness: true, title: "Medium" });
    const dir = engine.changeDir("auto4");
    engine.assessComplexity("auto4", { touchedModules: 5, hasUi: true, testLevels: 2 });
    const state = engine.getState("auto4")!;
    expect(state?.complexity?.level).toBe("medium");
    const plan = buildHarnessPlan(workspace, root, state!);
    const auxSkills = plan.auxiliary.map((s) => s.skill);
    expect(auxSkills).toContain("taiyi-intel-scan");
    expect(auxSkills).not.toContain("taiyi-architect");
    expect(auxSkills).not.toContain("taiyi-restyle");
  });

  it("review phase lists taiyi-health only in auxiliary, not iron triangle", () => {
    engine.initChange("rev1", { autoHarness: false });
    const dir = engine.changeDir("rev1");
    writeE2eArtifacts(dir);
    for (const p of ["change", "requirement", "design", "ui-design", "task", "dev", "test"] as const) {
      const r = engine.completePhase("rev1", p, GATES, { skipStepOrderCheck: true, skipArtifactValidation: true });
      expect(r.ok, `${p}: ${r.error}`).toBe(true);
    }
    const state = engine.getState("rev1")!;
    expect(state.currentPhase).toBe("review");
    const plan = buildHarnessPlan(workspace, root, state);
    const iron = plan.ironTriangle.map((s) => `${s.tool}/${s.skill}`);
    const aux = plan.auxiliary.map((s) => s.skill);
    expect(iron).toContain("gstack/review");
    expect(iron).not.toContain("taiyi/taiyi-health");
    expect(aux).toContain("taiyi-health");
    const blocked = buildHarnessPlan(workspace, root, { ...state, autoHarness: true });
    expect(formatHarnessPlanPlain(blocked)).toContain("下一命令");
  });

  it("optional iron triangle hooks do not block auto complete", () => {
    engine.initChange("opt1", { autoHarness: true });
    const dir = engine.changeDir("opt1");
    writeChangeArtifact(dir, "opt1");
    fs.writeFileSync(path.join(dir, "CONTEXT.md"), "# CONTEXT\n\n## Scan\nok\n", "utf8");
    markHarnessCheckpoint(dir, "change", "superpowers/brainstorming");
    const mark = engine.markAuxiliary("opt1", "taiyi-intel-scan");
    expect(mark.ok, mark.error).toBe(true);
    const done = engine.completePhase("opt1", "change", GATES, { skipArtifactValidation: true });
    expect(done.ok, done.error).toBe(true);

    const state = engine.getState("opt1")!;
    expect(state.currentPhase).toBe("requirement");
    const ctx = getHarnessContext(workspace, "opt1", "test");
    const pending = pendingIronTriangleHooks(dir, "test", ctx.hooks, false);
    expect(pending).not.toContain("gstack/qa");
    expect(pending).toContain("superpowers/verification-before-completion");
  });
});
