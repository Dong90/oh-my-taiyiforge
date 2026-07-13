import { describe, expect, it } from "vitest";
import { TestSchema } from "../../src/schemas/test.js";

describe("TestSchema", () => {
  const validData = {
    title: "用户登录测试",
    test_plan: [
      { id: "TC-01", description: "邮箱登录成功", status: "passed" as const },
      { id: "TC-02", description: "错误密码失败", status: "pending" as const },
    ],
  };

  it("accepts valid minimal data", () => {
    expect(() => TestSchema.parse(validData)).not.toThrow();
  });

  it("accepts test_coverage", () => {
    const data = {
      ...validData,
      test_coverage: { unit: "85%", integration: "60%", e2e: "30%" },
    };
    expect(() => TestSchema.parse(data)).not.toThrow();
  });

  it("accepts test_results_summary", () => {
    const data = {
      ...validData,
      test_results_summary: "1494/1502 passed",
    };
    expect(() => TestSchema.parse(data)).not.toThrow();
  });

  it("accepts both test_coverage and test_results_summary", () => {
    const data = {
      ...validData,
      test_coverage: { unit: "85%", integration: "60%", e2e: "30%" },
      test_results_summary: "1494/1502 passed",
    };
    const parsed = TestSchema.parse(data);
    expect(parsed.test_coverage?.unit).toBe("85%");
    expect(parsed.test_coverage?.integration).toBe("60%");
    expect(parsed.test_coverage?.e2e).toBe("30%");
    expect(parsed.test_results_summary).toBe("1494/1502 passed");
  });

  it("accepts unit_framework and unit_coverage_target", () => {
    const data = {
      ...validData,
      unit_framework: "vitest",
      unit_coverage_target: "90%",
    };
    const parsed = TestSchema.parse(data);
    expect(parsed.unit_framework).toBe("vitest");
    expect(parsed.unit_coverage_target).toBe("90%");
  });

  it("rejects empty test_plan", () => {
    const data = { ...validData, test_plan: [] };
    expect(() => TestSchema.parse(data)).toThrow();
  });

  it("rejects missing title", () => {
    const data = {
      test_plan: [{ id: "TC-01", description: "测试", status: "passed" as const }],
    };
    expect(() => TestSchema.parse(data)).toThrow();
  });

  it("defaults status to pending", () => {
    const data = {
      title: "测试",
      test_plan: [{ id: "TC-01", description: "测试" }],
    };
    const parsed = TestSchema.parse(data);
    expect(parsed.test_plan[0].status).toBe("pending");
  });
});
