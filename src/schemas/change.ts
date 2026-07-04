import { z } from "zod";

const ImpactEntry = z.object({
  module: z.string(),
  impact: z.string(),
  owner: z.string(),
});

const RiskEntry = z.object({
  risk: z.string(),
  probability: z.string(),
  impact: z.string(),
  mitigation: z.string(),
});

const InnovationToken = z.object({
  decision: z.string(),
  is_token: z.boolean(),
  reason: z.string(),
});

const StakeholderEntry = z.object({
  role: z.string(),
  name: z.string(),
  needs: z.string(),
});

const DreamState = z.object({
  current: z.string().describe("现状"),
  this_change: z.string().describe("本次增量"),
  ideal: z.string().describe("12月理想终态"),
});

/** 真验证记录:change/requirement/test 三阶段共享,success_criteria 标 is_checked=true 时必填 */
export const EvidenceSchema = z.object({
  command: z.string().min(3).describe("真跑过的命令"),
  exitCode: z.number().int().refine((n) => n === 0, { message: "exitCode 必须为 0" }).describe("命令退出码,必须 0"),
  stdout: z.string().optional().describe("命令 stdout 摘要(可选)"),
  capturedAt: z.string().refine((s) => !isNaN(Date.parse(s)), { message: "capturedAt 须为 ISO 时间" }).describe("捕获时间,ISO 8601"),
});

const FileBoundarySchema = z.object({
  limitFiles: z.array(z.string()).optional().describe("LIMIT 文件模式列表（如 src/module-a/**, src/module-b/**）"),
  fixFiles: z.array(z.string()).optional().describe("FIX 文件模式列表（变更涉及的主要文件）"),
  outScope: z.array(z.string()).optional().describe("已确认不超 scope 的例外路径"),
  exportedSymbols: z.array(z.string()).optional().describe("变更输出/影响的导出符号名称列表"),
});

export const ChangeSchema = z.object({
  title: z.string().describe("变更标题"),
  motivation: z.string().describe("为什么要做这个变更"),
  scope: z.object({
    includes: z.array(z.string()).describe("范围内要做的事"),
    excludes: z.array(z.string()).optional().describe("明确排除的事"),
  }),
  fileBoundary: FileBoundarySchema.optional().describe("文件边界声明 — 用于代码一致性自动校验"),
  visual_tone: z.string().optional().describe("视觉基调"),
  visual_reason: z.string().optional().describe("视觉选择理由"),
  visual_references: z.string().optional().describe("视觉参考"),
  visual_excluded: z.string().optional().describe("明确排除的视觉元素"),
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
  do_nothing_cost: z.string().optional().describe("不作为的代价"),
  target_state: z.string().optional().describe("目标状态描述"),
  premise_redefine: z.string().optional().describe("前提重新定义"),
  premise_cost: z.string().optional().describe("前提代价"),
  premise_existing: z.string().optional().describe("已有资产"),
  premise_scrap: z.string().optional().describe("放弃的方案"),
  migration_steps: z.string().optional().describe("迁移步骤"),
  rollback_trigger: z.string().optional().describe("回滚触发条件"),
  rollback_ops: z.string().optional().describe("回滚操作"),
  rollback_time: z.string().optional().describe("回滚时间"),
  impact_map: z.array(ImpactEntry).optional().describe("影响范围映射"),
  risks: z.array(RiskEntry).optional().describe("风险清单"),
  innovation_tokens: z.array(InnovationToken).optional().describe("创新积分卡"),
  stakeholders: z.array(StakeholderEntry).optional().describe("干系人清单"),
  dream_state: DreamState.optional().describe("Dream State 三阶段轨迹：现状→本次增量→12月理想"),
  evidence: EvidenceSchema.optional().describe("真验证记录,success_criteria 标 is_checked=true 时必填"),
}).strict();

export type ChangeSpec = z.infer<typeof ChangeSchema>;
