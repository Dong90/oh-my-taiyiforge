import { z } from "zod";

export const DesignSchema = z.object({
  title: z.string().describe("方案设计标题"),
  options: z
    .array(
      z.object({
        id: z.string().describe("方案标识，如 A、B"),
        name: z.string().min(1).describe("方案名称"),
        pros: z.array(z.string()).describe("优点列表"),
        cons: z.array(z.string()).describe("缺点列表"),
      })
    )
    .min(2)
    .describe("至少两个对比方案"),
  decision: z.object({
    chosen: z.string().describe("选中的方案 ID"),
    reason: z.string().min(1).describe("选择理由"),
  }),
});

export type DesignSpec = z.infer<typeof DesignSchema>;
