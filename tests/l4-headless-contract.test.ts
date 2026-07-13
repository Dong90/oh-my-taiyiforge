import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderTaiyiPrompt } from "../src/install/prompt-stage-protocol.js";
import { copyFullFlowDemoFixture, runForge } from "../src/core/run-slash-flow-cli.js";
import { E2E_ARTIFACTS } from "../src/core/e2e-fixtures.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROMPTS_DIR = path.join(REPO, "prompts");
const SLUG = "l4-headless-demo";

function seedChangeHarness(workspace: string, slug: string): void {
  const changeDir = path.join(workspace, ".taiyi", "changes", slug);
  fs.writeFileSync(path.join(changeDir, "CHANGE.md"), E2E_ARTIFACTS.change.md, "utf8");
  fs.writeFileSync(
    path.join(changeDir, "change.json"),
    JSON.stringify(E2E_ARTIFACTS.change.json, null, 2),
    "utf8",
  );
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

  it("扩展斜杠 prompt：taiyi-skill 伞形覆盖 sp brainstorming", () => {
    const promptsDir = path.join(REPO, "prompts");
    const raw = fs.readFileSync(path.join(promptsDir, "taiyi-skill.md"), "utf8");
    const skill = renderTaiyiPrompt("taiyi-skill.md", raw, promptsDir);
    expect(skill).toContain("brainstorming");
    expect(skill).toContain("Superpowers");
  });
});
