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

/**
 * Non-empty string helper for finding descriptions:
 * requires meaningful content beyond single character or generic words
 */
const MeaningfulDescription = z.string()
  .refine(
    (s) => s.trim().length >= 8,
    { message: "finding description 必须 ≥ 8 字符（trim 后），禁止 'ok' / '需注意' 等占位" }
  )
  .refine(
    (s) => !/^(\s|ok|待定|see|check|N\/?A|TODO|fixme|null|void)$/i.test(s.trim()),
    { message: "finding description 不能是 'ok' / 'TODO' / 'N/A' 等占位" }
  );

export const ReviewSchema = z.object({
  title: z.string().min(1).describe("评审标题"),
  reviewer: z.string().optional().describe("评审人"),
  review_date: z.string().optional().describe("评审日期"),
  // verdict **必须 explicit** 字段；review 阶段禁止自动盖印
  verdict: z.enum(["approved", "changes_requested", "blocked", "unreviewable"])
    .describe("评审结论 — 禁止盖印: 实际审查过才能 approved；没审查过的必须选 unreviewable"),
  overall_score: z.string().optional().describe("⭐ 总评分数，如 4.1/10"),
  findings_acknowledged: z.boolean()
    .describe("是否确认：(approving/未发现的) claim. true 时 findings 才允许为空")
    .default(false),
  code_quality: z.array(CodeQualityItem).optional().describe("代码质量五维评分"),
  test_coverage: z.array(TestCoverageItem).optional().describe("测试覆盖总结"),
  findings: z.array(
    z.object({
      id: z.string().optional(),
      round: z.enum(["R1", "R2", "R3", "R4"]).optional().describe("评审轮次: R1=功能, R2=架构, R3=测试, R4=文档"),
      severity: z.string().describe("严重度: Critical/High/Medium/Low"),
      description: MeaningfulDescription,
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
})
  .superRefine((data, ctx) => {
    const findings = data.findings ?? [];

    // Rule: verdict=approved REQUIRES findings ≥ 1 (反盖印 — 拦近似签名)
    if (findings.length === 0 && data.verdict === "approved") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["verdict"],
        message: "verdict='approved' 禁止 0 findings — 反盖印: 实际审查过才能 approved",
      });
    }

    // Rule: verdict=changes_requested 或 blocked 也 require ≥1 findings
    // (改 / 阻必须说明什么问题)
    if (findings.length === 0 && (data.verdict === "changes_requested" || data.verdict === "blocked")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["verdict"],
        message: `verdict='${data.verdict}' 禁止 0 findings — 须说明具体改/阻什么`,
      });
    }

    // Rule: verdict=unreviewable + 0 findings 是合法 (skipped review 显式承认)
    //  — 但若 findings_acknowledged=true 不写 findings 也行
  })
  .strict();

export type ReviewSpec = z.infer<typeof ReviewSchema>;
