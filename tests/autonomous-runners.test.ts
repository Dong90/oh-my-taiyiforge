import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { runAutopilotGuide } from "../src/core/autopilot-runner.js";
import { runTeamGuide, resolveTeamStage } from "../src/core/team-runner.js";
import { runUltraworkGuide } from "../src/core/ultrawork-runner.js";

describe("autonomous runners", () => {
  let workspace: string;
  let taiyiRoot: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-auto-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    engine = new WorkflowEngine(taiyiRoot);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("autopilot rejects missing slug", () => {
    const r = runAutopilotGuide(engine, workspace, taiyiRoot, "nope");
    expect(r.ok).toBe(false);
    expect(r.text).toContain("Autopilot 需要已有变更");
  });

  it("autopilot guides active change with harness steps", () => {
    engine.initChange("auto-demo", { profile: "lite", autoHarness: true });
    const r = runAutopilotGuide(engine, workspace, taiyiRoot, "auto-demo");
    expect(r.text).toContain("Autopilot");
    expect(r.text).toContain("harness");
    expect(r.autoHarness).toBe(true);
  });

  it("team maps phases to lanes", () => {
    engine.initChange("team-demo", { profile: "lite" });
    expect(resolveTeamStage("dev")).toBe("exec");
    expect(resolveTeamStage("change")).toBe("plan");
    expect(resolveTeamStage("review")).toBe("verify");

    const r = runTeamGuide(engine, "team-demo");
    expect(r.ok).toBe(true);
    expect(r.stage).toBe("plan");
    expect(r.text).toContain("Team · plan");
  });

  it("ultrawork only allows task and dev", () => {
    engine.initChange("uw-demo", { profile: "full" });
    const blocked = runUltraworkGuide(engine, "uw-demo");
    expect(blocked.ok).toBe(false);
    expect(blocked.text).toContain("task/dev");
  });
});
