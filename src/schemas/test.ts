import { z } from "zod";
import { EvidenceSchema } from "./change.js";

const EdgeCase = z.object({
  scenario: z.string(),
  tc: z.string().optional(),
  status: z.string().optional(),
});

const PerfTest = z.object({
  scenario: z.string(),
  target: z.string(),
  tool: z.string(),
  result: z.string().optional(),
});

const RegressionItem = z.object({
  item: z.string(),
  old_behaviour: z.string(),
  new_behaviour: z.string(),
  test: z.string(),
  red_green: z.string(),
  status: z.string(),
});

const RegressionPlan = z.object({
  scope: z.string(),
  cases: z.string(),
  method: z.string(),
  owner: z.string(),
});

const MockingBoundary = z.object({
  layer: z.string().describe("被 mock 的层级/模块名"),
  can_mock: z.boolean().describe("能否 mock：true=允许 false=禁止"),
  reason: z.string().describe("允许/禁止的理由"),
});

export const TestSchema = z.object({
  title: z.string().describe("测试计划标题"),
  unit_framework: z.string().optional().describe("单元测试框架"),
  unit_coverage_target: z.string().optional().describe("单元覆盖率目标"),
  test_plan: z.array(
    z.object({
      id: z.string().describe("测试用例 ID"),
      description: z.string().describe("测试描述"),
      status: z.enum(["passed", "failed", "pending"]).default("pending"),
    })
  ).min(1).describe("至少一条测试用例"),
  edge_cases: z.array(EdgeCase).optional().describe("边缘用例"),
  performance_tests: z.array(PerfTest).optional().describe("性能测试"),
  security_checks: z.array(z.string()).optional().describe("安全检查项"),
  regression_plan: z.array(RegressionPlan).optional().describe("回归计划"),
  regression_items: z.array(RegressionItem).optional().describe("回归项"),
  summary: z.string().optional(),
  coverage: z.string().optional().describe("覆盖率信息"),
  mocking_boundaries: z.array(MockingBoundary).optional().describe("Mock 边界契约：明确定义哪些层级可 mock 哪些不可"),
  evidence: EvidenceSchema.optional().describe("真验证记录,test_plan 有 passed 状态时推荐填"),
}).strict();

export type TestSpec = z.infer<typeof TestSchema>;
