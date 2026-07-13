import { describe, expect, it } from "vitest";
import { RequirementSchema } from "../../src/schemas/requirement.js";

describe("RequirementSchema", () => {
  it("accepts valid complete data", () => {
    const data = {
      title: "用户登录",
      user_stories: [
        { as_a: "用户", i_want: "使用邮箱登录", so_that: "能访问个人数据" },
        { as_a: "用户", i_want: "使用手机号登录", so_that: "没有邮箱也能登录" },
      ],
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
      user_stories: [
        { as_a: "用户", i_want: "使用邮箱登录", so_that: "能访问系统" },
      ],
      features: ["邮箱登录"],
      acceptance_criteria: [],
    };
    expect(() => RequirementSchema.parse(data)).toThrow();
  });

  it("rejects missing title", () => {
    const data = {
      user_stories: [
        { as_a: "用户", i_want: "使用邮箱登录", so_that: "能访问系统" },
      ],
      features: ["邮箱登录"],
      acceptance_criteria: [{ id: "AC-01", description: "能登录", is_checked: false }],
    };
    expect(() => RequirementSchema.parse(data)).toThrow();
  });

  it("rejects acceptance_criteria with missing id", () => {
    const data = {
      title: "用户登录",
      user_stories: [
        { as_a: "用户", i_want: "使用邮箱登录", so_that: "能访问系统" },
      ],
      features: ["邮箱登录"],
      acceptance_criteria: [{ description: "能登录", is_checked: false }],
    };
    expect(() => RequirementSchema.parse(data)).toThrow();
  });

  it("defaults is_checked to false when omitted", () => {
    const data = {
      title: "用户登录",
      user_stories: [
        { as_a: "用户", i_want: "使用邮箱登录", so_that: "能访问系统" },
      ],
      features: ["邮箱登录"],
      acceptance_criteria: [{ id: "AC-01", description: "能登录" }],
    };
    const parsed = RequirementSchema.parse(data);
    expect(parsed.acceptance_criteria[0].is_checked).toBe(false);
  });

  describe("FuncReqItem trigger / caller_module / blocked_by", () => {
    it("accepts functional_requirements with trigger and caller_module", () => {
      const data = {
        title: "Token 预算追踪",
        user_stories: [
          { as_a: "开发者", i_want: "追踪 token 使用", so_that: "控制成本" },
        ],
        acceptance_criteria: [{ id: "AC-01", description: "track 被调用后 tokenBudget.used 更新", is_checked: false }],
        functional_requirements: [{
          module: "orchestrator",
          items: [{
            id: "FR-T01",
            description: "track(slug,role,amount) 更新 pipeline.json tokenBudget.used",
            trigger: "executor.dispatch() 每次调用后",
            caller_module: "packages/orchestrator/src/executor.ts",
          }],
        }],
      };
      expect(() => RequirementSchema.parse(data)).not.toThrow();
    });

    it("accepts functional_requirements with blocked_by for out-of-scope callers", () => {
      const data = {
        title: "Token 预算追踪",
        user_stories: [
          { as_a: "开发者", i_want: "追踪 token 使用", so_that: "控制成本" },
        ],
        acceptance_criteria: [{ id: "AC-01", description: "track 被调用后 tokenBudget.used 更新", is_checked: false }],
        functional_requirements: [{
          module: "orchestrator",
          items: [{
            id: "FR-T01",
            description: "track(slug,role,amount) 更新 pipeline.json tokenBudget.used",
            trigger: "executor.dispatch() 每次调用后",
            caller_module: "packages/orchestrator/src/executor.ts",
            blocked_by: "M4-executor",
          }],
        }],
      };
      expect(() => RequirementSchema.parse(data)).not.toThrow();
    });

    it("accepts functional_requirements without optional trigger fields (backward compat)", () => {
      const data = {
        title: "用户登录",
        user_stories: [
          { as_a: "用户", i_want: "使用邮箱登录", so_that: "能访问系统" },
        ],
        acceptance_criteria: [{ id: "AC-01", description: "能登录", is_checked: false }],
        functional_requirements: [{
          module: "auth",
          items: [
            { id: "FR-01", description: "验证邮箱格式" },
            { id: "FR-02", description: "检查密码哈希" },
          ],
        }],
      };
      expect(() => RequirementSchema.parse(data)).not.toThrow();
    });

    it("rejects empty string trigger (require substantive if provided)", () => {
      const data = {
        title: "Token 预算追踪",
        user_stories: [
          { as_a: "开发者", i_want: "追踪 token 使用", so_that: "控制成本" },
        ],
        acceptance_criteria: [{ id: "AC-01", description: "track 被调用后更新", is_checked: false }],
        functional_requirements: [{
          module: "orchestrator",
          items: [{
            id: "FR-T01",
            description: "track token 使用",
            trigger: "   ",
          }],
        }],
      };
      expect(() => RequirementSchema.parse(data)).toThrow();
    });
  });
});
