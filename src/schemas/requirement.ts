import { z } from "zod";
import { EvidenceSchema } from "./change.js";

const NfrEntry = z.object({
  id: z.string(),
  description: z.string()
    .refine(
      (s) => s.trim().length === 0 || s.trim().length >= 8,
      { message: "NFR description 若填写则必须 ≥ 8 字符（trim 后），空值允许（seed 默认）" }
    ),
  metric_type: z.enum(["quantitative", "qualitative"]).optional()
    .describe("度量类型：quantitative=数字/单位，qualitative=行为/规范"),
  unit: z.string().optional().describe("量化单位（如 ms / req/s / MB / LOC）"),
  threshold: z.string().optional().describe("阈值或目标（如 ≤ 50ms、= 0 errors）"),
});

/**
 * trigger: 谁在什么时机调用这个 FR（如 "executor.dispatch() 每次调用后"）
 * caller_module: 触发函数所在的源文件路径
 * blocked_by: 当 caller 不在本 change scope 中时，标注依赖的 change slug
 */
const FuncReqItem = z.object({
  id: z.string(),
  description: z.string(),
  trigger: z.string()
    .trim()
    .min(1, "trigger 不可为空字符串（填入谁调用、什么时机，或省略整个字段）")
    .optional()
    .describe("谁在什么时机调用这个 FR"),
  caller_module: z.string()
    .optional()
    .describe("触发函数所在的源文件路径"),
  blocked_by: z.string()
    .optional()
    .describe("caller 不在本 scope 时标注依赖的 change slug"),
});

const FuncReqModule = z.object({
  module: z.string(),
  items: z.array(FuncReqItem),
});

const ErrorRescue = z.object({
  error: z.string(),
  trigger: z.string(),
  catch: z.string(),
  user_sees: z.string(),
  recovery: z.string(),
});

const ShadowPathFlow = z.object({
  flow: z.string(),
  happy_input: z.string(), happy_expected: z.string(),
  nil_input: z.string(), nil_expected: z.string(),
  empty_input: z.string(), empty_expected: z.string(),
  upstream_input: z.string(), upstream_expected: z.string(),
});

const NonHappyPath = z.object({
  scenario: z.string(),
  behavior: z.string(),
});

const Dependency = z.object({
  dependency: z.string(),
  type: z.string(),
  status: z.string(),
  risk: z.string(),
});

const UserStory = z.object({
  as_a: z.string().describe("As a [角色]"),
  i_want: z.string().describe("I want [功能]"),
  so_that: z.string().describe("So that [价值]"),
  priority: z.enum(["P0", "P1", "P2"]).optional().describe("优先级"),
  sprint: z.string().optional().describe("归属版本"),
});

export const RequirementSchema = z.object({
  title: z.string().describe("用一句话概括核心需求"),
  one_liner: z.string().optional().describe("一句线描述"),
  user_stories: z.array(UserStory).min(1).describe("用户故事 (As a / I want / So that) — 至少一条主路径; 反向/边界/异常建议各加一条以达到 ≥ 3 条"),
  features: z.array(z.string()).optional().describe("[deprecated] 由 user_stories 取代"),
  scope_v1: z.array(z.string()).optional().describe("v1 范围"),
  scope_v2: z.array(z.string()).optional().describe("v2 范围"),
  scope_out: z.array(z.string()).optional().describe("明确排除项"),
  functional_requirements: z.array(FuncReqModule).optional().describe("功能性需求"),
  non_functional: z.object({
    performance: z.array(NfrEntry).optional(),
    security: z.array(NfrEntry).optional(),
    availability: z.array(NfrEntry).optional(),
  }).optional().describe("非功能性需求"),
  acceptance_criteria: z
    .array(
      z.object({
        id: z.string().describe("唯一标识，如 AC-01"),
        description: z.string().describe("验收标准的具体描述"),
        is_checked: z.boolean().default(false).describe("是否已完成"),
        verify: z.string().optional().describe("验证命令"),
      })
    )
    .min(1)
    .describe("至少包含一条验收标准"),
  error_rescue_map: z.array(ErrorRescue).optional().describe("错误救援映射"),
  shadow_paths: z.array(ShadowPathFlow).optional().describe("影子路径分析"),
  non_happy_path_cases: z.array(NonHappyPath).optional().describe("非快乐路径用例"),
  dependencies: z.array(Dependency).optional().describe("依赖清单"),
  security_compliance: z.array(z.string()).optional().describe("安全合规项"),
  evidence: EvidenceSchema.optional().describe("真验证记录,acceptance_criteria 标 is_checked=true 时必填"),
}).strict();

export type RequirementSpec = z.infer<typeof RequirementSchema>;
