import { z } from "zod";

const CodeQualityItem = z.object({
  dimension: z.string(),
  score: z.string(),
  note: z.string(),
});

const TestCoverageItem = z.object({
  layer: z.string(),
  passed: z.string(),
  total: z.string(),
  coverage: z.string(),
  status: z.string(),
});

const PerfAuditItem = z.object({
  item: z.string(),
  status: z.string(),
  note: z.string().optional(),
});

export const ReviewSchema = z.object({
  title: z.string().min(1).describe("评审标题"),
  review_date: z.string().optional().describe("评审日期"),
  verdict: z.string().optional().describe("评审结论"),
  code_quality: z.array(CodeQualityItem).optional().describe("代码质量评分"),
  test_coverage: z.array(TestCoverageItem).optional().describe("测试覆盖总结"),
  findings: z.array(
    z.object({
      id: z.string().optional(),
      severity: z.string().describe("严重度"),
      description: z.string().min(1).describe("问题描述"),
      file: z.string().optional().describe("涉及文件"),
      line: z.string().optional().describe("行号"),
      action: z.string().optional().describe("建议操作"),
      resolved: z.boolean().optional(),
    })
  ).optional().describe("审查发现"),
  blocking_items: z.array(z.string()).optional().describe("阻塞项"),
  suggestion_items: z.array(z.string()).optional().describe("建议项"),
  security_audit: z.array(z.string()).optional().describe("安全审计"),
  performance_audit: z.array(PerfAuditItem).optional().describe("性能审计"),
  summary: z.string().optional().describe("总结"),
}).strict();

export type ReviewSpec = z.infer<typeof ReviewSchema>;
