import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tplPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/integration.hbs"
);

function render(data: unknown) {
  const source = fs.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(source)(data);
}

describe("integration.hbs", () => {
  const fullData = {
    title: "用户登录上线",
    release_version: "v1.2.0",
    changelog_entries: [
      { type: "Added", description: "邮箱验证码登录功能" },
      { type: "Fixed", description: "OAuth 超时 Bug" },
    ],
    breaking_changes: ["Session 存储格式变更，需重新登录"],
    monitoring: [
      { metric: "API P99", baseline: "200ms", threshold: ">500ms", severity: "high" },
    ],
  };

  it("renders title as H1 with prefix", () => {
    const out = render(fullData);
    expect(out).toContain("# INTEGRATION: 用户登录上线");
  });

  it("renders release version in header", () => {
    const out = render(fullData);
    expect(out).toContain("v1.2.0");
  });

  it("renders changelog section with entries", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 1: Changelog & Breaking Changes");
    expect(out).toContain("Added");
    expect(out).toContain("邮箱验证码登录功能");
    expect(out).toContain("Fixed");
    expect(out).toContain("OAuth 超时 Bug");
  });

  it("renders breaking changes section", () => {
    const out = render(fullData);
    expect(out).toContain("⚠️");
    expect(out).toContain("Session 存储格式变更，需重新登录");
  });

  it("renders migration section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 2: Migration");
    expect(out).toContain("### 数据库");
    expect(out).toContain("### 环境变量");
    expect(out).toContain("### 配置");
  });

  it("renders deployment checklist section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 3: Deployment Checklist");
    expect(out).toContain("DB迁移已执行");
    expect(out).toContain("回滚已验证");
    expect(out).toContain("上下游已通知");
  });

  it("renders observability section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 4: Observability");
    expect(out).toContain("### Dashboard");
    expect(out).toContain("### Alerts");
    expect(out).toContain("### Runbook");
  });

  it("renders post-launch watch section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 5: Post-Launch Watch");
    expect(out).toContain("**观察期**");
    expect(out).toContain("**退出标准**");
  });

  it("renders rollback plan section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 6: Rollback Plan");
    expect(out).toContain("**触发**");
    expect(out).toContain("**操作**");
    expect(out).toContain("**时间**");
  });

  it("renders monitoring section", () => {
    const out = render(fullData);
    expect(out).toContain("## Step 7: Monitoring & Alerts");
    expect(out).toContain("| 指标 | 基线 | 告警阈值 | 严重度 |");
  });

  it("renders release version in release section", () => {
    const out = render(fullData);
    expect(out).toContain("**Version**: `v1.2.0`");
  });

  it("renders quality gate with all entries", () => {
    const out = render(fullData);
    expect(out).toContain("## Quality Gate");
    expect(out).toContain("S6 回滚≤30min");
    expect(out).toContain("S7 监控覆盖所有SC");
  });

  it("renders no unrendered Handlebars tokens", () => {
    const out = render(fullData);
    expect(out).not.toMatch(/\{\{[#/]?[\w]+\}\}/);
  });

  it("renders with no breaking changes", () => {
    const out = render({
      title: "无break",
      changelog_entries: [{ type: "Changed", description: "小改动" }],
    });
    expect(out).toMatch(/\n无\n/);
    expect(out).not.toMatch(/\{\{[#/]?[a-zA-Z]+\}\}/);
  });

  it("renders without release_version", () => {
    const out = render({
      title: "未发布",
      changelog_entries: [],
    });
    expect(out).toContain("待定");
  });
});
