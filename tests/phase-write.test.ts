import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import {
  phaseIdFromSlashVerb,
  runPhaseWriteGuide,
  PHASE_SLASH_VERB,
} from "../src/core/phase-write.js";
import { runBugScenario, runFeatureScenario } from "../src/core/scenario-shortcuts.js";
import { taiyiWrite, taiyiPhaseWrite } from "../src/plugin/handlers.js";

describe("phase-write", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-write-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
    engine.initChange("write-demo", { profile: "full" });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("maps slash verbs to phase ids", () => {
    expect(phaseIdFromSlashVerb("change")).toBe("change");
    expect(phaseIdFromSlashVerb("ui-design")).toBe("ui-design");
    expect(PHASE_SLASH_VERB.integration).toBe("integration");
  });

  it("write guide targets current phase", () => {
    const r = runPhaseWriteGuide(engine, workspace, taiyiRoot, "write-demo", "change");
    expect(r.ok).toBe(true);
    expect(r.skill).toBe("taiyi-change");
    expect(r.text).toContain("CHANGE.md");
    expect(r.text).toContain("taiyi-change");
  });

  it("rejects mismatched phase write", () => {
    const r = runPhaseWriteGuide(engine, workspace, taiyiRoot, "write-demo", "dev");
    expect(r.ok).toBe(false);
    expect(r.mismatch).toBe(true);
    expect(r.text).toContain("阶段不一致");
  });

  it("handler write returns current phase skill", () => {
    const r = taiyiWrite(workspace, "write-demo");
    expect(r.ok).toBe(true);
    if ("text" in r && r.text) {
      expect(r.text).toContain("taiyi-change");
    }
  });

  it("handler phase write for change", () => {
    const r = taiyiPhaseWrite(workspace, "change", "write-demo");
    expect(r.ok).toBe(true);
    if ("text" in r && r.text) expect(r.text).toContain("/taiyi:continue");
  });
});

describe("scenario-shortcuts", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-scenario-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("feature playbook mentions nine phases", () => {
    engine.initChange("feat-x", { profile: "full" });
    const r = runFeatureScenario(engine, taiyiRoot, "feat-x");
    expect(r.text).toContain("/taiyi:change");
    expect(r.text).toContain("/taiyi:archive");
  });

  it("bug playbook mentions lite profile", () => {
    const r = runBugScenario(engine, taiyiRoot, "fix-login");
    expect(r.text).toContain("lite");
    expect(r.text).toContain("review-loop");
  });
});
