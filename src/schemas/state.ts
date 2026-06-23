import { z } from "zod";

export const PhaseProgressSchema = z.object({
  current: z.string().describe("当前阶段名称"),
  complete: z.boolean().describe("是否已完成"),
  artifacts: z.array(z.string()).optional().describe("已生成的工件文件"),
}).strict();

export const ChangeStateSchema = z.object({
  slug: z.string().min(1).describe("变更标识符"),
  title: z.string().optional().describe("变更标题"),
  active: z.boolean().describe("是否活跃中"),
  profile: z.enum(["full", "api", "ui", "lite", "spike", "micro", "nano", "audit"]).optional().describe("变更模板简档"),
  strictDev: z.boolean().optional().describe("是否严格开发模式"),
  failedPhase: z.string().optional().describe("失败阶段"),
  created: z.string().describe("创建时间 ISO 8601"),
  currentPhase: PhaseProgressSchema.describe("当前阶段进度"),
  phases: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    complete: z.boolean(),
    artifact: z.string().optional(),
  })).optional().describe("各阶段完成状态"),
  lastModified: z.string().optional().describe("最后修改时间"),
}).strict();

export type ChangeState = z.infer<typeof ChangeStateSchema>;
