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

describe("artifact-validator with Zod (mandatory)", () => {
  let tmpDir: string;
  let changeDir: string;

  const requirementData = {
    title: "用户登录功能",
    features: ["邮箱密码登录", "手机验证码登录"],
    scope_out: ["微信扫码登录", "SSO 集成"],
    acceptance_criteria: [
      { id: "AC-01", description: "用户输入邮箱和密码后点击登录", is_checked: false, verify: "npm run test:login" },
      { id: "AC-02", description: "错误密码显示红色提示", is_checked: false, verify: "npm run test:error" },
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

  it("no requirement.json -> all scores false, hints ask for JSON", () => {
    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# any content here");
    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(false);
    expect(result!.hints.some((h) => h.includes("缺少 requirement.json"))).toBe(true);
  });

  it("valid JSON + valid MD -> all scores true, no errors", async () => {
    await persistAndRender("requirement", requirementData, changeDir, templatesDir);

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(true);
    expect(result!.scores.consistency).toBe(true);
    expect(result!.hints.filter((h) => !h.startsWith("[建议]"))).toHaveLength(0);
  });

  it("corrupted JSON (empty acceptance_criteria) -> all false", () => {
    fs.writeFileSync(
      path.join(changeDir, "requirement.json"),
      JSON.stringify({ title: "x", features: [], acceptance_criteria: [] })
    );
    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# content extra text to pass");

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(false);
    expect(result!.hints.some((h) => h.includes("[Zod 校验失败]"))).toBe(true);
  });

  it("malformed JSON -> all false", () => {
    fs.writeFileSync(path.join(changeDir, "requirement.json"), "{ not json }");
    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# some content to exist");

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(false);
  });

  it("valid JSON but MD has seed template -> fails", async () => {
    await persistAndRender("requirement", requirementData, changeDir, templatesDir);
    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      "<!-- taiyi:seed-template -->\n# placeholder\n\n{{title}}"
    );

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result!.scores.completeness).toBe(false);
  });

  it("Zod CHANGE passes with valid JSON + MD", () => {
    fs.writeFileSync(path.join(changeDir, "change.json"), JSON.stringify({
      title: "优化登录流程",
      motivation: "用户反馈登录流程太慢，需要优化响应时间。",
      scope: { includes: ["优化登录 API", "添加加载状态提示"] },
      success_criteria: [
        { id: "SC-01", description: "登录响应时间 < 500ms" },
        { id: "SC-02", description: "加载状态正确显示" },
      ],
    }));
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");

    const result = validateArtifactFile(
      path.join(changeDir, "CHANGE.md"),
      "change"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(true);
  });

  it("Zod CHANGE fails without change.json", () => {
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");

    const result = validateArtifactFile(
      path.join(changeDir, "CHANGE.md"),
      "change"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(false);
    expect(result!.hints.some((h) => /缺少 change\.json/.test(h))).toBe(true);
  });

  it("Zod CHANGE fails with empty success_criteria", () => {
    fs.writeFileSync(path.join(changeDir, "change.json"), JSON.stringify({
      title: "x",
      motivation: "test",
      scope: { includes: ["x"] },
      success_criteria: [],
    }));
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "content for 60 chars minimum requirement here more extra text for fill to pass");

    const result = validateArtifactFile(
      path.join(changeDir, "CHANGE.md"),
      "change"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.consistency).toBe(false);
    expect(result!.hints.some((h) => /Zod 校验失败/.test(h))).toBe(true);
  });
});
