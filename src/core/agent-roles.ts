import type { PhaseId } from "./types.js";

/** TaiyiForge 原生专 Agent 角色（自 OMC 能力迁移，不依赖 oh-my-claudecode） */
export type AgentRoleDef = {
  id: string;
  label: string;
  phases: PhaseId[];
  /** 加载顺序：taiyi-* · superpowers/* · gstack/* */
  load: string[];
  when: string;
};

export const AGENT_ROLES: Record<string, AgentRoleDef> = {
  explore: {
    id: "explore",
    label: "代码库探索",
    phases: ["change"],
    load: ["taiyi-intel-scan", "superpowers/using-superpowers"],
    when: "立项前摸清仓库结构与约束",
  },
  analyst: {
    id: "analyst",
    label: "需求分析",
    phases: ["change", "requirement"],
    load: ["superpowers/brainstorming", "taiyi-change", "taiyi-requirement"],
    when: "澄清范围、风险、验收标准",
  },
  planner: {
    id: "planner",
    label: "执行计划",
    phases: ["requirement", "task"],
    load: ["superpowers/writing-plans", "taiyi-task"],
    when: "bite-sized 切片与依赖顺序",
  },
  "project-planner": {
    id: "project-planner",
    label: "项目规划",
    phases: ["change"],
    load: ["taiyi-plan", "taiyi-task"],
    when: "README/PRD → 模块拆分 + profile 推荐 + 批量创建 change",
  },
  architect: {
    id: "architect",
    label: "架构师",
    phases: ["design"],
    load: ["taiyi-design", "taiyi-architect", "gstack/plan-eng-review"],
    when: "≥2 方案与 ADR",
  },
  designer: {
    id: "designer",
    label: "UI/UX 设计",
    phases: ["ui-design"],
    load: ["taiyi-ui-design", "gstack/plan-design-review"],
    when: "界面契约与无障碍",
  },
  executor: {
    id: "executor",
    label: "实现",
    phases: ["dev"],
    load: ["taiyi-dev", "superpowers/test-driven-development"],
    when: "TDD 红绿重构写代码",
  },
  debugger: {
    id: "debugger",
    label: "排错",
    phases: ["dev", "test"],
    load: ["superpowers/systematic-debugging", "taiyi-dev"],
    when: "测试失败、回归、异常栈",
  },
  "test-engineer": {
    id: "test-engineer",
    label: "测试工程",
    phases: ["task", "test"],
    load: ["taiyi-task", "taiyi-test", "superpowers/test-driven-development"],
    when: "测试计划与 TEST.md 证据",
  },
  verifier: {
    id: "verifier",
    label: "完成验证",
    phases: ["test", "integration"],
    load: ["superpowers/verification-before-completion", "taiyi-test"],
    when: "声明完成前须有运行输出",
  },
  tracer: {
    id: "tracer",
    label: "追踪取证",
    phases: ["test", "review"],
    load: ["taiyi-test", "gstack/browse"],
    when: "复现步骤、截图、日志证据",
  },
  "security-reviewer": {
    id: "security-reviewer",
    label: "安全审查",
    phases: ["review"],
    load: ["/taiyi:test security", "taiyi-review"],
    when: "semgrep/trivy 与威胁面",
  },
  "code-reviewer": {
    id: "code-reviewer",
    label: "代码审查",
    phases: ["review"],
    load: ["taiyi-review", "superpowers/requesting-code-review", "gstack/review"],
    when: "REVIEW.md 与 review-loop",
  },
  "qa-tester": {
    id: "qa-tester",
    label: "QA 走查",
    phases: ["test"],
    load: ["/taiyi:gstack qa", "/taiyi:test e2e", "taiyi-test"],
    when: "站点/E2E 手工+自动 QA",
  },
  writer: {
    id: "writer",
    label: "文档",
    phases: ["integration"],
    load: ["taiyi-integration", "gstack/document-release"],
    when: "CHANGELOG 与集成说明",
  },
  "git-master": {
    id: "git-master",
    label: "Git 交付",
    phases: ["review", "integration"],
    load: ["/taiyi:commit", "/taiyi:ship", "/taiyi:land"],
    when: "trailer、PR、合并",
  },
  "code-simplifier": {
    id: "code-simplifier",
    label: "简化重构",
    phases: ["dev", "review"],
    load: ["taiyi-dev", "superpowers/receiving-code-review"],
    when: "行为不变的前提下降复杂度",
  },
  critic: {
    id: "critic",
    label: "方案挑战",
    phases: ["design", "review"],
    load: ["gstack/plan-eng-review", "/taiyi:review-loop"],
    when: "挑战前提与 scope",
  },
  scientist: {
    id: "scientist",
    label: "实验验证",
    phases: ["design", "test"],
    load: ["taiyi-design", "taiyi-test"],
    when: "spike/对比实验再定案",
  },
  "document-specialist": {
    id: "document-specialist",
    label: "规格文档",
    phases: ["requirement", "integration"],
    load: ["taiyi-requirement", "taiyi-integration"],
    when: "AC、API 契约、归档",
  },
  "style-reviewer": {
    id: "style-reviewer",
    label: "风格审查",
    phases: ["dev", "review"],
    load: ["gstack/review", "taiyi-dev"],
    when: "命名、格式、lint 一致性",
  },
  "api-reviewer": {
    id: "api-reviewer",
    label: "API 审查",
    phases: ["design", "review"],
    load: ["taiyi-design", "taiyi-review"],
    when: "HTTP 契约、版本、错误形状",
  },
  "performance-reviewer": {
    id: "performance-reviewer",
    label: "性能审查",
    phases: ["dev", "review"],
    load: ["gstack/benchmark", "taiyi-test"],
    when: "瓶颈、回归、bundle",
  },
  "dependency-expert": {
    id: "dependency-expert",
    label: "依赖专家",
    phases: ["design", "dev"],
    load: ["taiyi-design", "taiyi-dev"],
    when: "升级、供应链、license",
  },
  "quality-strategist": {
    id: "quality-strategist",
    label: "质量策略",
    phases: ["requirement", "test"],
    load: ["taiyi-requirement", "taiyi-test"],
    when: "验收维度、门禁策略",
  },
  "product-manager": {
    id: "product-manager",
    label: "产品经理",
    phases: ["change", "requirement"],
    load: ["taiyi-change", "taiyi-requirement", "superpowers/brainstorming"],
    when: "范围、优先级、用户故事",
  },
  "ux-researcher": {
    id: "ux-researcher",
    label: "UX 研究",
    phases: ["change", "ui-design"],
    load: ["taiyi-ui-design", "gstack/plan-design-review"],
    when: "用户场景、可用性假设",
  },
  "information-architect": {
    id: "information-architect",
    label: "信息架构",
    phases: ["design", "ui-design"],
    load: ["taiyi-design", "taiyi-ui-design"],
    when: "导航、内容结构、IA",
  },
  "product-analyst": {
    id: "product-analyst",
    label: "产品分析",
    phases: ["change", "requirement"],
    load: ["taiyi-change", "taiyi-intel-scan"],
    when: "竞品、指标、可行性",
  },
  vision: {
    id: "vision",
    label: "视觉验证",
    phases: ["ui-design", "test"],
    load: ["/taiyi:visual-verdict", "taiyi-ui-design", "gstack/browse"],
    when: "截图对比、视觉回归",
  },
};

/** 每阶段默认启用的专 Agent（可多角色并行） */
export const PHASE_AGENT_ROLES: Record<PhaseId, string[]> = {
  change: ["analyst", "explore", "project-planner"],
  requirement: ["analyst", "planner", "document-specialist"],
  design: ["architect", "critic", "scientist"],
  "ui-design": ["designer"],
  task: ["planner", "test-engineer"],
  dev: ["executor", "debugger", "test-engineer"],
  test: ["verifier", "qa-tester", "tracer", "debugger"],
  review: [
    "code-reviewer",
    "security-reviewer",
    "style-reviewer",
    "api-reviewer",
    "performance-reviewer",
    "critic",
    "git-master",
  ],
  integration: ["verifier", "writer", "git-master"],
};

export function getAgentRole(roleId: string): AgentRoleDef | undefined {
  return AGENT_ROLES[roleId.toLowerCase()];
}

export function listAgentRoleIds(): string[] {
  return Object.keys(AGENT_ROLES).sort();
}

export function rolesForPhase(phase: PhaseId): AgentRoleDef[] {
  return (PHASE_AGENT_ROLES[phase] ?? [])
    .map((id) => AGENT_ROLES[id])
    .filter((r): r is AgentRoleDef => Boolean(r));
}

export function formatAgentRoleProtocol(roleId: string, slug: string, phase: PhaseId): string {
  const role = getAgentRole(roleId);
  if (!role) {
    return [
      `未知角色: ${roleId}`,
      `可用: ${listAgentRoleIds().join(", ")}`,
      "用法: /taiyi:agent <role> [slug]",
    ].join("\n");
  }
  const strictPhase = process.env.TAIYI_AGENT_STRICT_PHASE === "1";
  if (strictPhase && !role.phases.includes(phase)) {
    return [
      `阶段门禁: ${role.label} (${role.id}) 不推荐于当前阶段 ${phase}`,
      `  推荐阶段: ${role.phases.join(", ")}`,
      "  解除: unset TAIYI_AGENT_STRICT_PHASE 或切换到推荐阶段",
      "  默认列表: /taiyi:agent list · 阶段默认: PHASE_AGENT_ROLES",
    ].join("\n");
  }
  const lines = [
    `Taiyi 专 Agent · ${role.label} (${role.id})`,
    `  阶段: ${role.phases.join(", ")}（当前 ${phase}）`,
  ];
  if (!role.phases.includes(phase)) {
    lines.push(
      `  ⚠ 当前阶段不在推荐范围 — 可按需加载；默认推荐见 PHASE_AGENT_ROLES / /taiyi:agent list`,
    );
  }
  lines.push(`  何时: ${role.when}`, "  加载:");
  for (const item of role.load) {
    if (item.startsWith("/taiyi:")) {
      lines.push(`    - ${item}`);
    } else {
      lines.push(`    - ${item}（/taiyi:sp ${item.split("/").pop()} 或 @${item.replace(/\//g, "-")}）`);
    }
  }
  lines.push(`  产出须写入 .taiyi/changes/${slug}/ 当前阶段工件`);
  lines.push("  完成后 /taiyi:continue 或 /taiyi:ralph / /taiyi:review-loop");
  return lines.join("\n");
}

export function formatPhaseAgentsPlain(phase: PhaseId, slug: string): string {
  const roles = rolesForPhase(phase);
  const lines = [`阶段 ${phase} 推荐专 Agent（/taiyi:agent <role>）:`];
  for (const r of roles) {
    lines.push(`  · ${r.id} — ${r.label}（${r.when}）`);
  }
  lines.push(`  并行: /taiyi:team ${slug} · 高吞吐: /taiyi:ultrawork ${slug}`);
  return lines.join("\n");
}
