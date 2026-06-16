import { describe, expect, it } from "vitest";
import { DesignSchema } from "../../src/schemas/design.js";

describe("DesignSchema", () => {
  const validData = {
    title: "用户登录方案设计",
    options: [
      {
        id: "A",
        name: "JWT Token 方案",
        pros: ["无状态", "易扩展"],
        cons: ["Token 无法主动失效"],
      },
      {
        id: "B",
        name: "Session + Redis 方案",
        pros: ["可主动失效", "成熟稳定"],
        cons: ["需要 Redis 集群", "有状态"],
      },
    ],
    decision: {
      chosen: "B",
      reason: "Session 方案虽然需要 Redis，但支持主动失效满足安全审计需求",
    },
  };

  it("accepts valid complete data", () => {
    expect(() => DesignSchema.parse(validData)).not.toThrow();
  });

  it("rejects less than 2 options", () => {
    const data = { ...validData, options: [validData.options[0]] };
    expect(() => DesignSchema.parse(data)).toThrow();
  });

  it("rejects missing decision.chosen", () => {
    const data = {
      ...validData,
      decision: { reason: "some reason" },
    };
    expect(() => DesignSchema.parse(data)).toThrow();
  });

  it("rejects empty option name", () => {
    const data = {
      ...validData,
      options: [{ id: "A", name: "", pros: ["x"], cons: [] }],
    };
    expect(() => DesignSchema.parse(data)).toThrow();
  });
});
