import { describe, expect, it } from "vitest";
import { TaskSchema } from "../../src/schemas/task.js";

describe("TaskSchema", () => {
  const validData = {
    title: "Token 预算追踪任务拆解",
    slices: [
      {
        id: "S1",
        description: "实现 TokenBudget.track() 方法，记录每次 dispatch 的 token 用量",
        files: ["packages/orchestrator/src/token-budget.ts"],
        write_files: ["packages/orchestrator/src/token-budget.ts"],
        test_command: "npx vitest run tests/token-budget",
        time_estimate: "2h",
        dependencies: "S0",
      },
    ],
  };

  it("accepts valid minimal data", () => {
    expect(() => TaskSchema.parse(validData)).not.toThrow();
  });

  it("rejects empty slices array", () => {
    expect(() => TaskSchema.parse({ ...validData, slices: [] })).toThrow();
  });

  describe("covers_frs — FR to slice coverage tracking", () => {
    it("accepts slice with covers_frs listing requirement FR ids", () => {
      const data = {
        ...validData,
        slices: [{
          ...validData.slices[0],
          covers_frs: ["FR-T01", "FR-T02"],
        }],
      };
      expect(() => TaskSchema.parse(data)).not.toThrow();
    });

    it("accepts slice without covers_frs (backward compat)", () => {
      expect(() => TaskSchema.parse(validData)).not.toThrow();
    });

    it("rejects covers_frs with empty string items", () => {
      const data = {
        ...validData,
        slices: [{
          ...validData.slices[0],
          covers_frs: [""],
        }],
      };
      expect(() => TaskSchema.parse(data)).toThrow();
    });

    it("accepts multiple slices each covering different FRs", () => {
      const data = {
        title: "multi-slice FR coverage",
        slices: [
          {
            id: "S1",
            description: "implement track method call integration",
            files: ["packages/orchestrator/src/executor.ts"],
            write_files: ["packages/orchestrator/src/executor.ts"],
            time_estimate: "1h",
            covers_frs: ["FR-T01"],
          },
          {
            id: "S2",
            description: "implement check method pipeline call",
            files: ["packages/orchestrator/src/pipeline.ts"],
            write_files: ["packages/orchestrator/src/pipeline.ts"],
            time_estimate: "1h",
            covers_frs: ["FR-P01"],
          },
        ],
      };
      expect(() => TaskSchema.parse(data)).not.toThrow();
    });
  });
});
