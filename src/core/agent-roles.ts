import type { PhaseId } from "./types.js";

/** TaiyiForge 原生专 Agent 角色（自 OMC 能力迁移，不依赖 oh-my-claudecode） */
export type AgentRoleDef = {
  id: string;
  label: string;
  phases: PhaseId[];
  /** 加载顺序：taiyi-* · superpowers/* · ecc/* */
  load: string[];
  when: string;
  /** 本角色必须通过的引擎门控（TDD：先知道会被什么拦住，再写内容） */
  gateChecks?: string[];
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
    gateChecks: ["SC quantifiable", "blocked_by deps exist"],
  },
  planner: {
    id: "planner",
    label: "执行计划",
    phases: ["requirement", "task"],
    load: ["ecc/planner", "taiyi-task"],
    when: "bite-sized 切片与依赖顺序",
    gateChecks: ["FR→slice coverage complete", "plan audit passed"],
  },
  architect: {
    id: "architect",
    label: "架构师",
    phases: ["design"],
    load: ["taiyi-design", "taiyi-architect", "ecc/architecture-audit"],
    when: "≥2 方案与 ADR",
    gateChecks: ["security_threats ≥1", "data flow present (api/full)", "design approval audit"],
  },
  designer: {
    id: "designer",
    label: "UI/UX 设计",
    phases: ["ui-design"],
    load: ["taiyi-ui-design", "ecc/web-design-guidelines"],
    when: "界面契约与无障碍",
    gateChecks: ["states ≥3 (loading/empty/error)", "accessibility ≥1"],
  },
  executor: {
    id: "executor",
    label: "实现",
    phases: ["dev"],
    load: ["taiyi-dev", "ecc/tdd-workflow"],
    when: "TDD 红绿重构写代码",
    gateChecks: ["TDD: test command present", "scope boundary intact", "architecture compliant"],
  },
  debugger: {
    id: "debugger",
    label: "排错",
    phases: ["dev", "test"],
    load: ["ecc/agent-introspection-debugging", "taiyi-dev"],
    when: "测试失败、回归、异常栈",
  },
  "test-engineer": {
    id: "test-engineer",
    label: "测试工程",
    phases: ["task", "test"],
    load: ["taiyi-task", "taiyi-test", "ecc/tdd-workflow"],
    when: "测试计划与 TEST.md 证据",
    gateChecks: ["AC coverage ≥80%", "AC auto-scan populated", "coverage threshold ≥80%"],
  },
  verifier: {
    id: "verifier",
    label: "完成验证",
    phases: ["test", "integration"],
    load: ["ecc/verification-loop", "taiyi-test"],
    when: "声明完成前须有运行输出",
  },
  tracer: {
    id: "tracer",
    label: "追踪取证",
    phases: ["test", "review"],
    load: ["taiyi-test", "playwright/e2e"],
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
    load: ["taiyi-review", "ecc/code-review", "ecc/security-scan"],
    when: "REVIEW.md 与 review-loop",
    gateChecks: ["export callers ≥1", "upstream artifacts complete", "score ≥3.5", "rounds complete"],
  },
  "qa-tester": {
    id: "qa-tester",
    label: "QA 走查",
    phases: ["test"],
    load: ["/taiyi:test e2e", "taiyi-test"],
    when: "站点/E2E 手工+自动 QA",
  },
  writer: {
    id: "writer",
    label: "文档",
    phases: ["integration"],
    load: ["taiyi-integration", "ecc/changelog-generator"],
    when: "CHANGELOG 与集成说明",
    gateChecks: ["CHANGELOG non-seed", "all artifacts non-seed", "audit passed", "coverage ≥80%"],
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
    load: ["ecc/architecture-audit", "/taiyi:review-loop"],
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
    load: ["taiyi-review", "taiyi-dev"],
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
    load: ["taiyi-test"],
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
    load: ["taiyi-ui-design", "ecc/web-design-guidelines"],
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
    load: ["/taiyi:visual-verdict", "taiyi-ui-design"],
    when: "截图对比、视觉回归",
  },
};

/** 每阶段默认启用的专 Agent（可多角色并行） */
export const PHASE_AGENT_ROLES: Record<PhaseId, string[]> = {
  change: ["analyst", "explore"],
  requirement: ["analyst", "planner", "document-specialist"],
  design: ["architect", "critic", "scientist"],
  "ui-design": ["designer"],
  task: ["planner", "test-engineer"],
  dev: ["executor", "debugger", "test-engineer"],
  test: ["verifier", "qa-tester", "tracer", "debugger", "test-engineer"],
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
    const gates = r.gateChecks ? ` [门控: ${r.gateChecks.join(", ")}]` : "";
    lines.push(`  · ${r.id} — ${r.label}（${r.when}）${gates}`);
  }
  lines.push(`  并行: /taiyi:team ${slug} · 高吞吐: /taiyi:ultrawork ${slug}`);
  return lines.join("\n");
}

/** 验证每个阶段至少有一个 agent 覆盖全部 gateChecks */
export function verifyAgentGateCoverage(): { phase: PhaseId; covered: string[]; gaps: string[] }[] {
  const phaseGates: Record<PhaseId, string[]> = {
    change: ["SC quantifiable"],
    requirement: ["blocked_by deps exist"],
    design: ["security_threats ≥1", "data flow present (api/full)", "design approval audit"],
    "ui-design": ["states ≥3 (loading/empty/error)", "accessibility ≥1"],
    task: ["FR→slice coverage complete", "plan audit passed"],
    dev: ["TDD: test command present", "scope boundary intact", "architecture compliant"],
    test: ["AC coverage ≥80%", "AC auto-scan populated", "coverage threshold ≥80%"],
    review: ["export callers ≥1", "upstream artifacts complete", "score ≥3.5", "rounds complete"],
    integration: ["CHANGELOG non-seed", "all artifacts non-seed", "audit passed", "coverage ≥80%"],
  };

  return Object.entries(phaseGates).map(([phase, requiredGates]) => {
    const roles = rolesForPhase(phase as PhaseId);
    const allAgentGates = new Set(roles.flatMap(r => r.gateChecks ?? []));
    const covered = requiredGates.filter(g => allAgentGates.has(g));
    const gaps = requiredGates.filter(g => !allAgentGates.has(g));
    return { phase: phase as PhaseId, covered, gaps };
  });
}
