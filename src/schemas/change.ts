import { z } from "zod";

/** 真验证记录:change/requirement/test 三阶段共享,success_criteria 标 is_checked=true 时必填 */
export const EvidenceSchema = z.object({
  command: z.string().min(3).describe("真跑过的命令"),
  exitCode: z.number().int().refine((n) => n === 0, { message: "exitCode 必须为 0" }).describe("命令退出码,必须 0"),
  stdout: z.string().optional().describe("命令 stdout 摘要(可选)"),
  capturedAt: z.string().refine((s) => !isNaN(Date.parse(s)), { message: "capturedAt 须为 ISO 时间" }).describe("捕获时间,ISO 8601"),
});

export const ChangeSchema = z.object({
  title: z.string().describe("变更标题"),
  motivation: z.string().describe("为什么要做这个变更"),
  scope: z.object({
    includes: z.array(z.string()).describe("范围内要做的事"),
    excludes: z.array(z.string()).optional().describe("明确排除的事"),
  }),
  success_criteria: z
    .array(
      z.object({
        id: z.string().describe("标识如 SC-01"),
        description: z.string().describe("可验证的成功标准"),
        is_checked: z.boolean().default(false),
      })
    )
    .min(1)
    .describe("至少一条成功标准"),
  evidence: EvidenceSchema.optional().describe("真验证记录,success_criteria 标 is_checked=true 时必填"),
});

export type ChangeSpec = z.infer<typeof ChangeSchema>;
