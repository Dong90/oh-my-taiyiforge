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
    features: ["邮箱登录", "手机号登录"],
    acceptance_criteria: [
      { id: "AC-01", description: "用户能输入邮箱和密码登录", is_checked: false },
      { id: "AC-02", description: "错误密码显示提示", is_checked: true },
    ],
  };

  it("renders title as H1", () => {
    const out = render(data);
    expect(out).toContain("# 用户登录");
  });

  it("renders features as unordered list", () => {
    const out = render(data);
    expect(out).toContain("* 邮箱登录");
    expect(out).toContain("* 手机号登录");
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
    expect(out).toContain("## 验收标准");
  });

  it("renders features section header", () => {
    const out = render(data);
    expect(out).toContain("## 核心功能");
  });
});
