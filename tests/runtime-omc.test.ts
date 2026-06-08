import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { activateMode, listActiveModes } from "../src/core/runtime/mode-state.js";
import { cancelRuntimeModes } from "../src/core/runtime/cancel-mode.js";
import { checkRalplanGate } from "../src/core/runtime/ralplan-gate.js";
import { buildSpawnPlan } from "../src/core/runtime/spawn-delegation.js";
import { detectKeywords } from "../src/core/runtime/keyword-modes.js";
import { rememberFact, readProjectMemory } from "../src/core/runtime/project-memory.js";
import { runWorkflowSkill } from "../src/core/runtime/workflow-skills.js";
import { startTeamMode } from "../src/core/runtime/team-state.js";
import { runTeamGuide } from "../src/core/team-runner.js";
import { listAgentRoleIds } from "../src/core/agent-roles.js";

describe("OMC native runtime migration", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-omc-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("tracks and cancels runtime modes", () => {
    activateMode(taiyiRoot, "ralph", "demo");
    activateMode(taiyiRoot, "ultrawork", "demo");
    expect(listActiveModes(taiyiRoot).length).toBe(2);

    const cancelled = cancelRuntimeModes(taiyiRoot);
    expect(cancelled.ok).toBe(true);
    expect(cancelled.cancelled).toContain("ralph");
    expect(listActiveModes(taiyiRoot).length).toBe(0);
  });

  it("ralplan-first blocks ralph without plan artifacts", () => {
    engine.initChange("ralplan-demo", { profile: "lite" });
    const changeDir = engine.changeDir("ralplan-demo");
    fs.writeFileSync(path.join(changeDir, "state.json"), fs.readFileSync(path.join(changeDir, "state.json")));
    // force dev phase in state
    const state = JSON.parse(fs.readFileSync(path.join(changeDir, "state.json"), "utf8"));
    state.currentPhase = "dev";
    fs.writeFileSync(path.join(changeDir, "state.json"), JSON.stringify(state));

    const gate = checkRalplanGate(changeDir, "dev");
    expect(gate.ok).toBe(false);
    expect(gate.text).toContain("ralplan-first");
  });

  it("builds spawn plan from TASK slices", () => {
    const taskMd = `### Slice: auth\n- [ ] login\n### Slice: api\n- [ ] endpoint`;
    const plan = buildSpawnPlan("s1", "dev", taskMd);
    expect(plan.workers.length).toBeGreaterThan(0);
    expect(plan.maxParallel).toBe(6);
  });

  it("detects OMC-compatible keywords", () => {
    const k = detectKeywords("please ralph until green");
    expect(k[0]?.type).toBe("ralph");
    const stop = detectKeywords("stopomc");
    expect(stop[0]?.slash).toBe("/taiyi:stop-mode");
    const team = detectKeywords("use team mode");
    expect(team[0]?.slash).toBe("/taiyi:team");
    const deslop = detectKeywords("deslop this PR");
    expect(deslop[0]?.slash).toBe("/taiyi:ai-slop-cleaner");
    const ccg = detectKeywords("run ccg on the design");
    expect(ccg[0]?.slash).toBe("/taiyi:ccg");
    const ultrathink = detectKeywords("ultrathink this architecture");
    expect(ultrathink[0]?.slash).toBe("/taiyi:explore");
    const deepsearch = detectKeywords("deepsearch the codebase");
    expect(deepsearch[0]?.slash).toBe("/taiyi:explore");
    const ext = detectKeywords("need external-context for API");
    expect(ext[0]?.slash).toBe("/taiyi:external-context");
  });

  it("stores project memory", () => {
    rememberFact(taiyiRoot, { category: "pattern", text: "use vitest" });
    const mem = readProjectMemory(taiyiRoot);
    expect(mem.facts.length).toBe(1);
  });

  it("runs workflow skill ralplan guide", () => {
    engine.initChange("wf", { profile: "lite" });
    const r = runWorkflowSkill(engine, taiyiRoot, "ralplan", "wf");
    expect(r.ok).toBe(true);
    expect(r.text).toContain("Ralplan");
  });

  it("runs workflow skill ccg guide", () => {
    engine.initChange("ccg-w", { profile: "lite" });
    const r = runWorkflowSkill(engine, taiyiRoot, "ccg", "ccg-w");
    expect(r.ok).toBe(true);
    expect(r.text).toContain("CCG");
  });

  it("team pipeline persists state", () => {
    engine.initChange("team-x", { profile: "lite" });
    const r = runTeamGuide(engine, "team-x", taiyiRoot);
    expect(r.ok).toBe(true);
    expect(r.text).toContain("team-mode.json");
    const team = startTeamMode(taiyiRoot, "team-x", "change");
    expect(team.stage).toBe("plan");
  });

  it("agent catalog covers OMC extended roles", () => {
    const ids = listAgentRoleIds();
    expect(ids).toContain("style-reviewer");
    expect(ids).toContain("vision");
    expect(ids.length).toBe(29);
  });
});
