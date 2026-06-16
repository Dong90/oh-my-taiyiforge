import { z } from "zod";

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
});

export type TestSpec = z.infer<typeof TestSchema>;
