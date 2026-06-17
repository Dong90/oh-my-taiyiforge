import { z } from "zod";
import { EvidenceSchema } from "./change.js";

export const TestSchema = z.object({
  title: z.string().describe("测试计划标题"),
  test_plan: z.array(
    z.object({
      id: z.string().describe("测试用例 ID"),
      description: z.string().describe("测试描述"),
      status: z.enum(["passed", "failed", "pending"]).default("pending"),
    })
  ).min(1).describe("至少一条测试用例"),
  summary: z.string().optional(),
  coverage: z.string().optional().describe("覆盖率信息"),
  evidence: EvidenceSchema.optional().describe("真验证记录,test_plan 有 passed 状态时推荐填"),
});

export type TestSpec = z.infer<typeof TestSchema>;
