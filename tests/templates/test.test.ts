import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tplPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/test.hbs"
);

function render(data: unknown) {
  const source = fs.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(source)(data);
}

describe("test.hbs", () => {
  const data = {
    title: "用户登录测试",
    test_plan: [
      { id: "TC-01", description: "邮箱登录成功", status: "unit" },
    ],
  };

  it("renders title", () => {
    const out = render(data);
    expect(out).toContain("# TEST: 用户登录测试");
  });

  it("renders UAT scripts section", () => {
    const out = render(data);
    expect(out).toContain("UAT");
  });

  it("renders 5-round pyramid section", () => {
    const out = render(data);
    expect(out).toContain("5-Round Coverage");
    expect(out).toContain("Round 1");
    expect(out).toContain("Round 5");
  });

  it("renders 5-round safety dimension", () => {
    const out = render(data);
    expect(out).toContain("Round 3 · 安全");
  });

  it("renders compatibility matrix section", () => {
    const out = render(data);
    expect(out).toContain("Compatibility Matrix");
  });

  it("renders viewport check table", () => {
    const out = render(data);
    expect(out).toContain("Mobile");
    expect(out).toContain("Desktop");
  });

  it("renders code path coverage section", () => {
    const out = render(data);
    expect(out).toContain("## Step 3: Code Path Coverage");
    expect(out).toContain("CODE PATH COVERAGE");
    expect(out).toContain("USER FLOW COVERAGE");
  });

  it("renders regression rule section", () => {
    const out = render(data);
    expect(out).toContain("## Step 4: Regression Rule");
    expect(out).toContain("Red-green");
  });

  it("renders edge case coverage section", () => {
    const out = render(data);
    expect(out).toContain("## Step 5: Edge Case Coverage");
  });

  it("renders performance tests section", () => {
    const out = render(data);
    expect(out).toContain("## Step 6: Performance Tests");
    expect(out).toContain("| 场景 | 目标 | 工具 | 结果 |");
  });

  it("renders security tests section", () => {
    const out = render(data);
    expect(out).toContain("## Step 7: Security Tests");
    expect(out).toContain("OWASP Top10");
  });

  it("renders compatibility matrix with browser/breakpoint/schema", () => {
    const out = render(data);
    expect(out).toContain("### 浏览器");
    expect(out).toContain("### 视口");
    expect(out).toContain("### 数据迁移");
  });

  it("renders regression test plan section", () => {
    const out = render(data);
    expect(out).toContain("## Step 8: Regression Test Plan");
    expect(out).toContain("| 回归范围 | 用例数 | 执行方式 | 负责人 |");
  });

  it("renders quality gate with CI automation check", () => {
    const out = render(data);
    expect(out).toContain("CI可自动化");
  });

  it("renders with empty test_plan (no crashes)", () => {
    const out = render({ title: "空测试" });
    expect(out).toContain("# TEST: 空测试");
    expect(out).not.toMatch(/\{\{[#/]?[a-zA-Z]+\}\}/);
  });

  it("renders no unrendered Handlebars tokens", () => {
    const out = render(data);
    expect(out).not.toMatch(/\{\{[#/]?[\w]+\}\}/);
  });
});
