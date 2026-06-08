import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderTaiyiPrompt } from "../src/install/prompt-stage-protocol.js";
import { DEV_COMPLETE_EVIDENCE } from "../src/core/dev-complete.js";
import { copyFullFlowDemoFixture, runForge } from "../src/core/run-slash-flow-cli.js";
import { E2E_ARTIFACTS } from "../src/core/e2e-fixtures.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPTS_DIR = path.join(REPO, "prompts");
const SLUG = "l4-headless-demo";

function renderPrompt(name: string): string {
  const raw = fs.readFileSync(path.join(PROMPTS_DIR, name), "utf8");
  return renderTaiyiPrompt(name, raw, PROMPTS_DIR);
}

function seedChangeHarness(workspace: string, slug: string): void {
  const changeDir = path.join(workspace, ".taiyi", "changes", slug);
  fs.writeFileSync(path.join(changeDir, "CHANGE.md"), E2E_ARTIFACTS.change, "utf8");
  fs.writeFileSync(
    path.join(changeDir, "CONTEXT.md"),
    "# CONTEXT\n\n## Scan\nl4 headless\n",
    "utf8",
  );
  runForge(REPO, workspace, ["harness-check", slug, "superpowers/brainstorming"]);
  runForge(REPO, workspace, ["mark-aux", slug, "taiyi-intel-scan"]);
}

/**
 * L4 IDE UAT 清单的无头替代：验 CLI + prompt 契约 + runtime 状态文件。
 * 不启动 Cursor / 不调用 LLM；Agent「真写代码」由 full-flow E2E 夹具覆盖。
 */
describe("L4 headless contract (CLI + prompt 替代 IDE UAT)", () => {
  let workspace: string;
  let taiyiRoot: string;
  let changeDir: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-l4-headless-"));
    copyFullFlowDemoFixture(REPO, workspace);
    taiyiRoot = path.join(workspace, ".taiyi");
    changeDir = path.join(taiyiRoot, "changes", SLUG);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("new/init → status 显示 change 阶段", () => {
    const init = runForge(REPO, workspace, [
      "init",
      SLUG,
      "--profile",
      "lite",
      "--title",
      "L4 headless",
    ]);
    expect(init.code).toBe(0);
    expect(fs.existsSync(changeDir)).toBe(true);
    expect(fs.existsSync(path.join(changeDir, "CHANGE.md"))).toBe(true);

    const status = runForge(REPO, workspace, ["status", SLUG]);
    expect(status.code).toBe(0);
    expect(status.out).toMatch(/change/i);
  });

  it("handoff 写 HANDOFF.md（/taiyi:handoff 契约）", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--title", "h"]);
    const handoff = runForge(REPO, workspace, ["handoff", SLUG, "--reason", "l4-smoke"]);
    expect(handoff.code).toBe(0);
    const p = path.join(changeDir, "HANDOFF.md");
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.readFileSync(p, "utf8")).toMatch(/handoff|暂停|l4-smoke/i);
  });

  it("agent executor 输出 dev 协议", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--title", "h"]);
    const r = runForge(REPO, workspace, ["agent", "executor", SLUG]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/executor|dev|TDD|taiyi-dev/i);
  });

  it("team → 写入 team-mode.json", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--title", "h"]);
    const team = runForge(REPO, workspace, ["team", SLUG]);
    expect(team.code).toBe(0);
    expect(team.out).toMatch(/team-mode\.json|Team/i);
    expect(fs.existsSync(path.join(taiyiRoot, "runtime", "team-mode.json"))).toBe(true);
  });

  it("ultrawork @ dev → 写入 ultrawork-mode.json", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--title", "h"]);
    const statePath = path.join(changeDir, "state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.currentPhase = "dev";
    state.completedPhases = ["change", "requirement"];
    fs.writeFileSync(statePath, JSON.stringify(state));

    const ulw = runForge(REPO, workspace, ["ultrawork", SLUG]);
    expect(ulw.code).toBe(0);
    expect(ulw.out).toMatch(/ultrawork-mode\.json|Ultrawork/i);
    expect(fs.existsSync(path.join(taiyiRoot, "runtime", "ultrawork-mode.json"))).toBe(true);
  });

  it("continue + ralph：dev 阶段 npm test 真跑（full-flow-demo 夹具）", () => {
    runForge(REPO, workspace, ["init", SLUG, "--profile", "lite", "--auto", "--title", "ralph"]);
    seedChangeHarness(workspace, SLUG);
    runForge(REPO, workspace, ["continue", SLUG, "--approver", "l4-headless"]);

    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), E2E_ARTIFACTS.requirement, "utf8");
    runForge(REPO, workspace, ["continue", SLUG]);

    // lite 跳过 task 阶段，但 ralplan-first 仍要求 TASK.md（或 RALPLAN.md）
    fs.writeFileSync(path.join(changeDir, "TASK.md"), E2E_ARTIFACTS.task, "utf8");

    const state1 = JSON.parse(fs.readFileSync(path.join(changeDir, "state.json"), "utf8"));
    expect(state1.currentPhase).toBe("dev");

    fs.writeFileSync(path.join(changeDir, ".dev-complete"), DEV_COMPLETE_EVIDENCE, "utf8");

    const ralph = runForge(REPO, workspace, ["ralph", SLUG]);
    expect(ralph.code).toBe(0);
    expect(ralph.out).toMatch(/pass|✓|green/i);
  }, 120_000);

  it("扩展斜杠 prompt：gstack browse / sp brainstorming / resume", () => {
    const gstack = renderPrompt("taiyi-gstack.md");
    expect(gstack).toMatch(/browse|gstack/i);

    const sp = renderPrompt("taiyi-sp.md");
    expect(sp).toMatch(/brainstorming|superpowers/i);

    const resume = renderPrompt("taiyi-resume.md");
    expect(resume).toMatch(/HANDOFF\.md|resume/i);
  });

  it("health prompt 要求 mark-aux + health-report.md", () => {
    const health = renderPrompt("taiyi-health.md");
    expect(health).toMatch(/health-report\.md|mark-aux|taiyi-health/i);
  });
});
