import { z } from "zod";

export const IntegrationSchema = z.object({
  title: z.string().describe("集成标题"),
  changelog_entries: z.array(
    z.object({
      type: z.enum(["feat", "fix", "docs", "chore", "refactor", "test", "ci"]),
      description: z.string().describe("变更描述"),
    })
  ).min(1).describe("至少一条 changelog"),
  breaking_changes: z.array(z.string()).optional(),
  release_version: z.string().optional(),
});

export type IntegrationSpec = z.infer<typeof IntegrationSchema>;
