import { z } from "zod";

const profileSchema = z.enum(["full", "api", "ui", "lite", "spike", "micro", "nano", "audit"]);
const phaseIdSchema = z.string().min(1);
const complexitySchema = z.object({
  level: z.enum(["low", "medium", "high"]),
  score: z.number(),
  recommendedSkills: z.array(z.string()),
  recommendedProfile: profileSchema.optional(),
}).strict();

export const ChangeStateSchema = z.object({
  slug: z.string().min(1).describe("变更标识符"),
  currentPhase: phaseIdSchema.describe("当前阶段名称"),
  completedPhases: z.array(phaseIdSchema),
  workflowStatus: z.enum(["active", "completed", "aborted"]).optional(),
  profile: profileSchema,
  skippedPhases: z.array(phaseIdSchema),
  strictDev: z.boolean(),
  autoHarness: z.boolean().optional(),
  complexity: complexitySchema.optional(),
  auxiliaryCompleted: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().nonnegative().optional(),
}).strict();

export type ChangeState = z.infer<typeof ChangeStateSchema>;
