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
  reviewer: z.string().optional().describe("评审人"),
  review_date: z.string().optional().describe("评审日期"),
  verdict: z.string().optional().describe("评审结论"),
  overall_score: z.string().optional().describe("⭐ 总评分数，如 4.1/10"),
  code_quality: z.array(CodeQualityItem).optional().describe("代码质量五维评分"),
  test_coverage: z.array(TestCoverageItem).optional().describe("测试覆盖总结"),
  findings: z.array(
    z.object({
      id: z.string().optional(),
      round: z.enum(["R1", "R2", "R3", "R4"]).optional().describe("评审轮次: R1=功能, R2=架构, R3=测试, R4=文档"),
      severity: z.string().describe("严重度: Critical/High/Medium/Low"),
      description: z.string().min(1).describe("问题描述"),
      file: z.string().optional().describe("涉及文件"),
      line: z.string().optional().describe("行号"),
      suggestion: z.string().optional().describe("修复建议"),
      action: z.string().optional().describe("建议操作"),
      approved_by: z.string().optional().describe("审批人 (例: <name> / 团队)"),
      resolved: z.union([z.boolean(), z.enum(["deferred"])]).optional()
        .describe("已解决 / 延后 (true=已修，deferred=稍后再修但放过本阶段)"),
    })
  ).optional().describe("审查发现"),
  blocking_items: z.array(z.string()).optional().describe("阻塞项"),
  suggestion_items: z.array(z.string()).optional().describe("建议项"),
  security_audit: z.array(z.string()).optional().describe("安全审计"),
  performance_audit: z.array(PerfAuditItem).optional().describe("性能审计"),
  summary: z.string().optional().describe("总结"),
}).strict();

export type ReviewSpec = z.infer<typeof ReviewSchema>;
