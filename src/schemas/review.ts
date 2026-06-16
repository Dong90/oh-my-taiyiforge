import { z } from "zod";

export const ReviewSchema = z.object({
  title: z.string().describe("评审标题"),
  verdict: z.enum(["approved", "changes_requested", "commented"]).describe("审批结论"),
  findings: z.array(
    z.object({
      id: z.string().describe("发现编号"),
      severity: z.enum(["high", "medium", "low"]).describe("严重程度"),
      description: z.string().describe("问题描述"),
      resolved: z.boolean().default(false),
    })
  ).optional(),
  summary: z.string().optional(),
});

export type ReviewSpec = z.infer<typeof ReviewSchema>;
