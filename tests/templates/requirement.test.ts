import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tplPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/templates/requirement.hbs"
);

function render(data: unknown) {
  const source = fs.readFileSync(tplPath, "utf-8");
  return Handlebars.compile(source)(data);
}

describe("requirement.hbs", () => {
  const data = {
    title: "用户登录",
    user_stories: [
      { as_a: "用户", i_want: "使用邮箱登录", so_that: "能安全访问账户", priority: "P0" },
      { as_a: "用户", i_want: "使用手机号登录", so_that: "没有邮箱也能登录", priority: "P1" },
    ],
    features: ["邮箱登录", "手机号登录"],
    acceptance_criteria: [
      { id: "AC-01", description: "用户能输入邮箱和密码登录", is_checked: false, verify: "npm test -- auth.test.ts" },
      { id: "AC-02", description: "错误密码显示提示", is_checked: true, verify: "" },
    ],
    scope_v1: ["邮箱验证码登录", "OAuth 超时优化"],
    scope_v2: ["指纹登录", "人脸识别"],
    scope_out: ["社交账号绑定"],
    non_functional: {
      performance: [{ id: "NFR-P01", description: "页面加载 < 2s" }],
      security: [{ id: "NFR-S01", description: "OWASP Top10 审计通过" }],
      availability: [{ id: "NFR-A01", description: "99.9% 可用性" }],
    },
    error_rescue_map: [
      { error: "网络超时", trigger: "API 调用超过 5s", catch: "axios interceptor", user_sees: "网络不稳定，请重试", recovery: "点击重试按钮" },
    ],
    shadow_paths: [
      { flow: "登录流程", happy_input: "正确邮箱+密码", happy_expected: "跳转首页", nil_input: "无输入", nil_expected: "按钮禁用", empty_input: "空邮箱", empty_expected: "提示必填", upstream_input: "认证服务宕机", upstream_expected: "提示稍后重试" },
    ],
    non_happy_path_cases: [
      { scenario: "快速双击", behavior: "仅发送一次请求" },
    ],
    dependencies: [
      { dependency: "vitest", type: "测试框架", status: "active", risk: "none" },
    ],
  };

  it("renders title as H1", () => {
    const out = render(data);
    expect(out).toContain("# REQUIREMENT: 用户登录");
  });

  it("renders user stories in correct format", () => {
    const out = render(data);
    expect(out).toContain("- **As a** 用户, **I want** 使用邮箱登录, **so that** 能安全访问账户 (P0)");
    expect(out).toContain("- **As a** 用户, **I want** 使用手机号登录, **so that** 没有邮箱也能登录 (P1)");
  });

  it("renders unchecked AC with [ ]", () => {
    const out = render(data);
    expect(out).toContain("- [ ] **AC-01**: 用户能输入邮箱和密码登录");
  });

  it("renders checked AC with [x]", () => {
    const out = render(data);
    expect(out).toContain("- [x] **AC-02**: 错误密码显示提示");
  });

  it("renders acceptance_criteria section header", () => {
    const out = render(data);
    expect(out).toContain("## Step 4: Acceptance Criteria");
  });

  it("renders features section header", () => {
    const out = render(data);
    expect(out).toContain("## Step 1: User Stories");
  });

  it("renders v1 scope items", () => {
    const out = render(data);
    expect(out).toContain("邮箱验证码登录");
    expect(out).toContain("OAuth 超时优化");
  });

  it("renders v2/out section headers", () => {
    const out = render(data);
    expect(out).toContain("v2（下次）");
    expect(out).toContain("out（永不）");
  });

  it("renders AC verify command", () => {
    const out = render(data);
    expect(out).toContain("npm test -- auth.test.ts");
  });

  it("renders scope partitioning section with v1/v2/out", () => {
    const out = render(data);
    expect(out).toContain("## Step 2: Scope Partitioning");
    expect(out).toContain("### v1（本次必做）");
    expect(out).toContain("### v2（下次）");
    expect(out).toContain("### out（永不）");
  });

  it("renders non-functional requirements section", () => {
    const out = render(data);
    expect(out).toContain("## Step 5: Non-Functional Requirements");
    expect(out).toContain("### 性能");
    expect(out).toContain("### 安全");
    expect(out).toContain("### 可用性");
  });

  it("renders error & rescue map section", () => {
    const out = render(data);
    expect(out).toContain("## Step 6: Error & Rescue Map");
    expect(out).toContain("| 错误类型 | 触发 | 捕获 | 用户看到 | 恢复 |");
  });

  it("renders shadow path analysis section", () => {
    const out = render(data);
    expect(out).toContain("## Step 7: Shadow Path Analysis");
    expect(out).not.toMatch(/\[流程名\]/);
  });

  it("renders non-happy-path matrix section", () => {
    const out = render(data);
    expect(out).toContain("## Step 8: Non-Happy-Path Matrix");
  });

  it("renders dependencies section", () => {
    const out = render(data);
    expect(out).toContain("## Step 9: Dependencies");
    expect(out).toContain("| 依赖 | 类型 | 状态 | 风险 |");
  });

  it("renders security & compliance section", () => {
    const out = render(data);
    expect(out).toContain("## Step 10: Security & Compliance");
    expect(out).toContain("OWASP Top10");
  });

  it("renders quality gate with all entries", () => {
    const out = render(data);
    expect(out).toContain("S2 版本切分 v1/v2/out 各≥1条");
    expect(out).toContain("S10 安全合规已覆盖");
  });

  it("renders with empty feature/AC lists (no crashes)", () => {
    const out = render({ title: "空需求", features: [], acceptance_criteria: [] });
    expect(out).toContain("# REQUIREMENT: 空需求");
    expect(out).not.toMatch(/\{\{[#/]?[a-zA-Z]+\}\}/);
  });

  it("renders no unrendered Handlebars tokens", () => {
    const out = render(data);
    expect(out).not.toMatch(/\{\{[#/]?[\w]+\}\}/);
  });
});
