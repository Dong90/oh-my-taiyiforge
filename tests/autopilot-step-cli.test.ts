import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { E2E_ARTIFACTS } from "../src/core/e2e-fixtures.js";
import { copyFullFlowDemoFixture, runForge } from "../src/core/run-slash-flow-cli.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "autopilot-step-demo";

describe("autopilot + step CLI 链（lite · 夹具）", () => {
  let workspace: string;
  let changeDir: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-autopilot-step-"));
    copyFullFlowDemoFixture(REPO, workspace);
    taiyiRoot = path.join(workspace, ".taiyi");
    changeDir = path.join(taiyiRoot, "changes", SLUG);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("init --auto → autopilot → step(human-gate) → continue → step(advanced)", () => {
    const init = runForge(REPO, workspace, [
      "init",
      SLUG,
      "--profile",
      "lite",
      "--auto",
      "--title",
      "Autopilot step smoke",
    ]);
    expect(init.code).toBe(0);

    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), E2E_ARTIFACTS.change, "utf8");

    const autopilot = runForge(REPO, workspace, ["autopilot", SLUG]);
    expect(autopilot.code).toBe(0);
    expect(autopilot.out).toMatch(/Autopilot|autopilot/i);
    expect(fs.existsSync(path.join(taiyiRoot, "runtime", "autopilot-mode.json"))).toBe(true);

    const step1 = runForge(REPO, workspace, ["step", SLUG]);
    expect(step1.code).toBe(1);
    expect(step1.out).toMatch(/Autopilot|人工|approver|human/i);

    // auto 模式 continue 前须铁三角打卡 + 辅助 Skill 工件
    fs.writeFileSync(
      path.join(changeDir, "CONTEXT.md"),
      "# CONTEXT\n\n## Scan\nautopilot-step smoke\n",
      "utf8",
    );
    const hc = runForge(REPO, workspace, [
      "harness-check",
      SLUG,
      "superpowers/brainstorming",
    ]);
    expect(hc.code).toBe(0);
    const markAux = runForge(REPO, workspace, ["mark-aux", SLUG, "taiyi-intel-scan"]);
    expect(markAux.code).toBe(0);

    const cont = runForge(REPO, workspace, [
      "continue",
      SLUG,
      "--approver",
      "autopilot-step-e2e",
    ]);
    expect(cont.code).toBe(0);

    const state1 = JSON.parse(fs.readFileSync(path.join(changeDir, "state.json"), "utf8"));
    expect(state1.currentPhase).toBe("requirement");
    expect(state1.completedPhases).toContain("change");

    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      E2E_ARTIFACTS.requirement,
      "utf8",
    );

    const step2 = runForge(REPO, workspace, ["step", SLUG]);
    expect(step2.out).toMatch(/Autopilot|步进|requirement|dev/i);
    expect([0, 1]).toContain(step2.code);

    const state2 = JSON.parse(fs.readFileSync(path.join(changeDir, "state.json"), "utf8"));
    const advanced =
      state2.completedPhases.includes("requirement") ||
      state2.currentPhase === "dev";
    expect(advanced).toBe(true);
  }, 120_000);
});
