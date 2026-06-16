import { z } from "zod";

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
});

export type ChangeSpec = z.infer<typeof ChangeSchema>;
