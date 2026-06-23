import { z } from "zod";

const ModuleEntry = z.object({
  name: z.string(),
  operation: z.string(),
  path: z.string(),
  description: z.string(),
});

const BlastRadiusEntry = z.object({
  decision: z.string(),
  radius: z.string(),
  worst_case: z.string(),
  isolation: z.string(),
});

const InnovationToken = z.object({
  decision: z.string(),
  is_token: z.boolean(),
  reason: z.string(),
});

const Tradeoff = z.object({
  point: z.string(),
  choice: z.string(),
  reason: z.string(),
});

const SecurityThreat = z.object({
  threat: z.string(),
  vector: z.string(),
  mitigation: z.string(),
});

const DependencyEntry = z.object({
  name: z.string().describe("依赖包/服务名"),
  version_range: z.string().describe("版本范围"),
  purpose: z.string().describe("用途"),
  alternatives_considered: z.string().optional().describe("考虑过的替代方案"),
  npm_latest: z.string().optional().describe("npm 最新版本"),
  staleness_check: z.string().optional().describe("过时检查结果"),
});

export const DesignSchema = z.object({
  title: z.string().describe("方案设计标题"),
  techStack: z.object({
    selected: z.string().describe("选中的技术栈"),
    reason: z.string().min(1).describe("选择理由"),
    frontend: z.string().optional(),
    backend: z.string().optional(),
    database: z.string().optional(),
    deployment: z.string().optional(),
    keyDeps: z.string().optional(),
    excluded: z.string().optional(),
  }).optional(),
  existingArchitecture: z.object({
    touchedModules: z.array(z.string()).describe("触碰的既有模块"),
    newModules: z.array(z.string()).describe("新增模块"),
    doNotTouch: z.array(z.string()).optional().describe("禁动清单"),
  }).optional(),
  modules: z.array(ModuleEntry).optional().describe("模块清单"),
  options: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    cost: z.string().optional(),
    approach: z.string().optional(),
  })).min(2).describe("至少两个对比方案"),
  decision: z.object({
    chosen: z.string().describe("选中的方案 ID"),
    reason: z.string().min(1).describe("选择理由"),
    tradeoffs: z.string().optional().describe("取舍说明"),
  }),
  current_state: z.string().optional().describe("当前架构/行为状态描述（变更前基线，ADR 强制覆写模式）"),
  dependency_sandbox: z.array(DependencyEntry).optional().describe("依赖沙箱清单：版本范围/用途/替代方案/过时检查"),
  blast_radius: z.array(BlastRadiusEntry).optional().describe("爆炸半径分析"),
  design_innovation_tokens: z.array(InnovationToken).optional().describe("设计创新积分"),
  tradeoffs: z.array(Tradeoff).optional().describe("方案取舍清单"),
  new_artifact: z.string().optional().describe("新增工件"),
  rollback_trigger: z.string().optional().describe("回滚条件"),
  rollout_steps: z.array(z.string()).optional().describe("上线步骤"),
  security_threats: z.array(SecurityThreat).optional().describe("安全威胁建模"),
  evolutionSuggestions: z.array(z.object({
    type: z.enum(["reusable-abstraction", "tech-decision", "cross-module-contract", "dependency-change"]),
    description: z.string().min(1),
  })).optional().describe("架构沉淀建议，无则空数组"),
}).strict();

export type DesignSpec = z.infer<typeof DesignSchema>;
