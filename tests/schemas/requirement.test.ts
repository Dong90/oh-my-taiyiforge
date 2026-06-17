import { describe, expect, it } from "vitest";
import { RequirementSchema } from "../../src/schemas/requirement.js";

describe("RequirementSchema", () => {
  it("accepts valid complete data", () => {
    const data = {
      title: "用户登录",
      features: ["邮箱登录", "手机号登录"],
      acceptance_criteria: [
        { id: "AC-01", description: "用户能输入邮箱和密码登录", is_checked: false },
        { id: "AC-02", description: "错误密码显示提示", is_checked: false },
      ],
    };
    expect(() => RequirementSchema.parse(data)).not.toThrow();
  });

  it("rejects empty acceptance_criteria array", () => {
    const data = {
      title: "用户登录",
      features: ["邮箱登录"],
      acceptance_criteria: [],
    };
    expect(() => RequirementSchema.parse(data)).toThrow();
  });

  it("rejects missing title", () => {
    const data = {
      features: ["邮箱登录"],
      acceptance_criteria: [{ id: "AC-01", description: "能登录", is_checked: false }],
    };
    expect(() => RequirementSchema.parse(data)).toThrow();
  });

  it("rejects acceptance_criteria with missing id", () => {
    const data = {
      title: "用户登录",
      features: ["邮箱登录"],
      acceptance_criteria: [{ description: "能登录", is_checked: false }],
    };
    expect(() => RequirementSchema.parse(data)).toThrow();
  });

  it("defaults is_checked to false when omitted", () => {
    const data = {
      title: "用户登录",
      features: ["邮箱登录"],
      acceptance_criteria: [{ id: "AC-01", description: "能登录" }],
    };
    const parsed = RequirementSchema.parse(data);
    expect(parsed.acceptance_criteria[0].is_checked).toBe(false);
  });
});
