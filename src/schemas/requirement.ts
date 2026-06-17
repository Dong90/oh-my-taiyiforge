import { z } from "zod";

export const RequirementSchema = z.object({
  title: z.string().describe("用一句话概括核心需求"),
  features: z.array(z.string()).describe("核心功能点列表"),
  acceptance_criteria: z
    .array(
      z.object({
        id: z.string().describe("唯一标识，如 AC-01"),
        description: z.string().describe("验收标准的具体描述"),
        is_checked: z.boolean().default(false).describe("是否已完成"),
      })
    )
    .min(1)
    .describe("至少包含一条验收标准"),
});

export type RequirementSpec = z.infer<typeof RequirementSchema>;
