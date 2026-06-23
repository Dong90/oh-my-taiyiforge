import { z } from "zod";

export const ChangelogEntry = z.object({
  type: z.enum(["feat", "fix", "docs", "chore", "refactor", "test", "ci"]),
  description: z.string().min(1).describe("变更描述"),
}).strict();

export const AlertEntry = z.object({
  alert: z.string().min(1).describe("告警名称"),
  condition: z.string().min(1).describe("触发条件"),
  severity: z.enum(["high", "medium", "low"]).describe("严重度"),
  channel: z.string().min(1).describe("通知渠道"),
}).strict();

export const MonitoringEntry = z.object({
  metric: z.string().min(1).describe("指标名"),
  baseline: z.string().min(1).describe("基线值"),
  threshold: z.string().min(1).describe("告警阈值"),
  severity: z.enum(["high", "medium", "low"]).describe("严重度"),
}).strict();

export const PostLaunchSpec = z.object({
  period: z.string().min(1).describe("观察期"),
  metrics: z.string().min(1).describe("观察指标"),
  exit_criteria: z.string().min(1).describe("退出标准"),
  incident_response: z.string().optional().describe("异常处理"),
}).strict();

export const IntegrationSchema = z.object({
  title: z.string().min(1).describe("集成标题"),
  release_version: z.string().optional().describe("发布版本号"),
  release_date: z.string().optional().describe("发布日期"),
  status: z.string().optional().describe("发布状态"),
  has_config_changes: z.boolean().optional().describe("是否有配置变更"),
  changelog_entries: z.array(ChangelogEntry).min(1).describe("至少一条 changelog"),
  breaking_changes: z.array(z.string()).optional().describe("Breaking changes 说明"),
  dashboard_url: z.string().optional().describe("仪表盘链接"),
  alerts: z.array(AlertEntry).optional().describe("告警配置"),
  post_launch: PostLaunchSpec.optional().describe("上线观察期计划"),
  rollback_trigger: z.string().optional().describe("回滚触发条件"),
  rollback_step1: z.string().optional().describe("回滚步骤1"),
  rollback_step2: z.string().optional().describe("回滚步骤2"),
  rollback_time: z.string().optional().describe("回滚时间"),
  monitoring: z.array(MonitoringEntry).optional().describe("长期监控指标"),
}).strict();

export type IntegrationSpec = z.infer<typeof IntegrationSchema>;
