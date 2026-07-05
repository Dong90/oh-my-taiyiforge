import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tplPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/review.hbs"
);

Handlebars.registerHelper("eq", function (a, b) { return a === b; });
Handlebars.registerHelper("neq", function (a, b) { return a !== b; });
Handlebars.registerHelper("not", function (a) { return !a; });
Handlebars.registerHelper("and", function (...args: unknown[]) {
  return args.slice(0, -1).every((v) => Boolean(v));
});
Handlebars.registerHelper("or", function (...args: unknown[]) {
  return args.slice(0, -1).some((v) => Boolean(v));
});
Handlebars.registerHelper("nonempty", function (v: unknown) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
});

function render(data: unknown) {
  const source = fs.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(source)(data);
}

describe("review.hbs", () => {
  const fullData = {
    title: "登录优化 review",
    verdict: "approved",
    findings: [
      { id: "F-01", severity: "critical", resolved: false, description: "密码明文日志问题", round: "R1" },
      { id: "F-02", severity: "medium", resolved: true, description: "缺少 loading 状态", round: "R1" },
    ],
  };

  it("renders title as H1 with prefix", () => {
    const out = render(fullData);
    expect(out).toContain("# REVIEW: 登录优化 review");
  });

  it("renders verdict in header", () => {
    const out = render(fullData);
    expect(out).toContain("approved");
  });

  it("renders review scope section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 1: Rounds & Findings");
  });

  it("renders findings with severity and resolution status", () => {
    const out = render(fullData);
    expect(out).toContain("F-01");
    expect(out).toContain("critical");
    expect(out).toContain("❌"); // unresolved
    expect(out).toContain("密码明文日志问题");
    expect(out).toContain("✅"); // resolved
    expect(out).toContain("缺少 loading 状态");
  });

  it("renders verdict section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 2: Verdict & Action Items");
  });

  it("renders code quality audit section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 3: Code Quality Audit");
    expect(out).toContain("| 维度 | 评分 | 备注 |");
  });

  it("renders test coverage audit section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 4: Test Coverage Audit");
    expect(out).toContain("| 层 | 通过/总 | 覆盖率 | 状态 |");
  });

  it("renders security audit section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 5: Security Audit");
    expect(out).toContain("认证/授权检查完整");
    expect(out).toContain("npm audit");
  });

  it("renders performance audit section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 6: Performance Audit");
    expect(out).toContain("| 检查项 | 状态 | 备注 |");
  });

  it("renders quality gate with all checkboxes", () => {
    const out = render(fullData);
    expect(out).toContain("## Quality Gate");
    expect(out).toContain("S1 所有finding有位置+置信度+建议");
    expect(out).toContain("[H]  S6 关键路径无瓶颈");
  });

  it("renders no unrendered Handlebars tokens", () => {
    const out = render(fullData);
    expect(out).not.toMatch(/\{\{[#/]?[\w]+\}\}/);
  });

  it("renders with no findings (falls back to default placeholders)", () => {
    const out = render({ title: "无问题", verdict: "approved" });
    expect(out).toContain("# REVIEW: 无问题");
    expect(out).toMatch(/R1: Functional Review/);
    expect(out).toMatch(/R2: Architecture Review/);
    expect(out).toMatch(/R3: Test Review/);
    expect(out).toMatch(/R4: Documentation Review/);
    // Empty findings should produce STAMP warning
    expect(out).toContain("REVIEW 缺口");
    expect(out).not.toMatch(/\{\{[#/]?[a-zA-Z]+\}\}/);
  });
});
