import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tplPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/change.hbs"
);

function render(data: unknown) {
  const source = fs.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(source)(data);
}

describe("change.hbs", () => {
  const fullData = {
    title: "用户登录优化",
    slug: "login-optimize",
    motivation: "当前登录成功率仅 85%，用户流失严重",
    scope: {
      includes: ["邮箱验证码登录", "OAuth 超时优化"],
      excludes: ["社交账号绑定", "人脸识别"],
    },
    success_criteria: [
      { id: "SC-01", description: "登录成功率 ≥ 99%", is_checked: false },
      { id: "SC-02", description: "超时从 60s 降到 10s", is_checked: true },
    ],
  };

  it("renders title as H1 with prefix", () => {
    const out = render(fullData);
    expect(out).toContain("# CHANGE: 用户登录优化");
  });

  it("renders slug and status in header", () => {
    const out = render(fullData);
    expect(out).toContain("login-optimize");
    expect(out).toContain("active");
  });

  it("renders problem statement section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 1: Problem Statement");
    expect(out).toContain("当前登录成功率仅 85%");
  });

  it("renders boundary section with in/out scope", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 2: Boundary Definition");
    expect(out).toContain("邮箱验证码登录");
    expect(out).toContain("社交账号绑定");
  });

  it("renders visual direction section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 3: Visual Direction");
  });

  it("renders premise challenge section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 4: Premise Challenge");
    expect(out).toContain("Scrap it?");
  });

  it("renders impact map section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 5: Impact Map");
    expect(out).toContain("| 模块/服务/团队 |");
  });

  it("renders success criteria with checkboxes", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 6: Success Criteria");
    expect(out).toContain("**SC-01**");
    expect(out).toContain("**SC-02**");
  });

  it("renders dream state section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 7: Dream State");
    expect(out).toContain("CURRENT");
    expect(out).toContain("12-MONTH IDEAL");
  });

  it("renders risk assessment section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 8: Risk Assessment");
    expect(out).toContain("| 风险 | 概率 | 影响 | 缓解 |");
  });

  it("renders innovation token check section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 9: Innovation Token Check");
    expect(out).toContain("_已花费:");
  });

  it("renders migration & rollback section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 10: Migration & Rollback");
    expect(out).toContain("**回滚触发**");
  });

  it("renders stakeholder sign-off section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 11: Stakeholder Sign-off");
    expect(out).toContain("| 角色 | 姓名 | 诉求 |");
  });

  it("renders quality gate with all checkboxes", () => {
    const out = render(fullData);
    expect(out).toContain("## Quality Gate");
    expect(out).toContain("S1 有量化数据");
    expect(out).toContain("S6 每条SC可度量");
    expect(out).toContain("S11 干系人无遗漏");
  });

  it("renders no unrendered Handlebars tokens", () => {
    const out = render(fullData);
    expect(out).not.toMatch(/\{\{[#/]?[\w]+\}\}/);
  });

  it("renders with minimal data (only required fields)", () => {
    const out = render({ title: "最小测试", slug: "minimal" });
    expect(out).toContain("# CHANGE: 最小测试");
    expect(out).toContain("## Step 1: Problem Statement");
    expect(out).toContain("## Quality Gate");
    // Should still show default/placeholder values, not raw Handlebars
    expect(out).not.toMatch(/\{\{[#/]?success_criteria\]?\}\}/);
  });

  it("renders with empty scope including default excludes text", () => {
    const out = render({
      title: "空范围",
      slug: "empty-scope",
      scope: { includes: [], excludes: [] },
      success_criteria: [],
    });
    expect(out).toContain("- _无_");
  });
});
