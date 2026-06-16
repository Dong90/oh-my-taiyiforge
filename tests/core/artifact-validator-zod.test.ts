import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateArtifactFile } from "../../src/core/artifact-validator.js";
import { persistAndRender } from "../../src/core/state-manager.js";
import { fileURLToPath } from "node:url";

const templatesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates"
);

describe("artifact-validator with Zod", () => {
  let tmpDir: string;
  let changeDir: string;

  const requirementData = {
    title: "用户登录功能",
    features: ["邮箱密码登录", "手机验证码登录"],
    acceptance_criteria: [
      { id: "AC-01", description: "用户输入邮箱和密码后点击登录", is_checked: false },
      { id: "AC-02", description: "错误密码显示红色提示", is_checked: false },
    ],
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-zod-"));
    changeDir = path.join(tmpDir, "test-change");
    fs.mkdirSync(changeDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("no requirement.json → heuristic runs, no Zod hints", () => {
    const md = [
      "# 用户登录功能",
      "",
      "## User Stories",
      "| US-01 | 作为普通用户 | 我想要输入邮箱和密码登录 | 以便访问个人中心系统 |",
      "",
      "## Acceptance Criteria",
      "- **Given** 用户已经打开登录页面并且输入了邮箱",
      "- **When** 用户输入正确的密码并点击登录按钮",
      "- **Then** 系统验证通过后跳转到首页",
    ].join("\n");

    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), md);
    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.scores.completeness).toBe(true);
      // No Zod-specific hints since no JSON exists
      expect(result.hints.filter((h) => h.includes("[Zod")).length).toBe(0);
    }
  });

  it("valid JSON + valid MD → Zod passes, no Zod hints injected", async () => {
    await persistAndRender("requirement", requirementData, changeDir, templatesDir);

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    if (result) {
      // No Zod error hints should appear
      expect(result.hints.filter((h) => h.includes("[Zod")).length).toBe(0);
    }
  });

  it("corrupted JSON with empty acceptance_criteria → Zod catches it", () => {
    fs.writeFileSync(
      path.join(changeDir, "requirement.json"),
      JSON.stringify({
        title: "x",
        features: [],
        acceptance_criteria: [], // violates min(1)
      })
    );
    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      "# x\n\ncontent here to pass length check min 60 characters... and more content to fill the minimum requirement"
    );

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.hints.some((h) => h.includes("[Zod 校验失败]"))).toBe(true);
      expect(result.scores.completeness).toBe(false);
      expect(result.scores.consistency).toBe(false);
    }
  });

  it("malformed JSON (not parseable) → Zod catches it", () => {
    fs.writeFileSync(
      path.join(changeDir, "requirement.json"),
      "{ bad json }"
    );
    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      "# content goes here and must be at least sixty characters long to pass the length check"
    );

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.hints.some((h) => h.includes("[Zod 校验失败]"))).toBe(true);
    }
  });

  it("other phases (CHANGE) are unaffected", () => {
    const md = [
      "# 优化登录流程",
      "",
      "## Motivation",
      "用户反馈登录流程太慢，需要优化响应时间。",
      "",
      "## Scope",
      "- 优化登录 API",
      "- 添加加载状态提示",
      "",
      "## Success Criteria",
      "- [ ] 登录响应时间 < 500ms",
      "- [ ] 加载状态正确显示",
    ].join("\n");

    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), md);
    const result = validateArtifactFile(
      path.join(changeDir, "CHANGE.md"),
      "change"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(true);
  });
});
