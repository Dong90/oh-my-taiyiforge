import { z } from "zod";
import { EvidenceSchema } from "./change.js";

const NfrEntry = z.object({
  id: z.string(),
  description: z.string(),
});

const FuncReqItem = z.object({
  id: z.string(),
  description: z.string(),
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

export const RequirementSchema = z.object({
  title: z.string().describe("用一句话概括核心需求"),
  one_liner: z.string().optional().describe("一句线描述"),
  features: z.array(z.string()).describe("核心功能点列表"),
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
