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

  it("no requirement.json → all scores false, hints ask for JSON", () => {
    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# any content here");
    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(false);
    expect(result!.hints.some((h) => h.includes("缺少 requirement.json"))).toBe(true);
  });

  it("valid JSON + valid MD → all scores true, no errors", async () => {
    await persistAndRender("requirement", requirementData, changeDir, templatesDir);

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(true);
    expect(result!.scores.consistency).toBe(true);
    expect(result!.hints).toHaveLength(0);
  });

  it("corrupted JSON (empty acceptance_criteria) → all false", () => {
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

  it("malformed JSON → all false", () => {
    fs.writeFileSync(path.join(changeDir, "requirement.json"), "{ not json }");
    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# some content to exist");

    const result = validateArtifactFile(
      path.join(changeDir, "REQUIREMENT.md"),
      "requirement"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(false);
  });

  it("valid JSON but MD has seed template → fails", async () => {
    await persistAndRender("requirement", requirementData, changeDir, templatesDir);
    // Overwrite MD with seed template
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

  it("other phases (CHANGE) still use legacy heuristic", () => {
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
  fs.writeFileSync(path.join(changeDir, "change.json"), JSON.stringify({"title": "Demo", "motivation": "test reason", "scope": {"includes": ["x"]}, "success_criteria": [{"id": "SC-01", "description": "pass"}]}));
    const result = validateArtifactFile(
      path.join(changeDir, "CHANGE.md"),
      "change"
    );
    expect(result).not.toBeNull();
    expect(result!.scores.completeness).toBe(true);
  });
});
