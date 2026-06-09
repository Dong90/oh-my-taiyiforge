import type { WorkflowEngine } from "../workflow-engine.js";
import type { PhaseId } from "../types.js";
import { activateMode, type TaiyiModeId } from "./mode-state.js";
import { formatPhaseAgentsPlain } from "../agent-roles.js";

export type WorkflowSkillId =
  | "plan"
  | "ralplan"
  | "ultraqa"
  | "visual-verdict"
  | "deep-interview"
  | "ai-slop-cleaner"
  | "ecomode"
  | "ccg"
  | "sciomc"
  | "deepinit"
  | "external-context";

export type WorkflowSkillResult = {
  ok: boolean;
  skill: WorkflowSkillId;
  slug: string;
  phase: PhaseId;
  text: string;
};

const SKILL_PROTOCOL: Record<WorkflowSkillId, (slug: string, phase: PhaseId) => string[]> = {
  plan: (slug, phase) => [
    "══ Taiyi Plan（原生 · 对标 OMC plan）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "工作流:",
    "  1. /taiyi:sp brainstorming — 澄清意图与约束",
    "  2. /taiyi:agent analyst · planner — 需求与切片",
    "  3. 产出 REQUIREMENT.md + TASK.md（或 PLAN.md）",
    "  4. /taiyi:continue",
    "",
    "复杂变更: 接 /taiyi:ralplan",
  ],
  ralplan: (slug, phase) => [
    "══ Taiyi Ralplan（原生 · Planner+Architect+Critic）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "ralplan-first 门禁: dev/test 跑 /taiyi:ralph 前须 RALPLAN.md 或 REQUIREMENT+TASK",
    "",
    "工作流:",
    "  1. /taiyi:agent planner — 初稿计划",
    "  2. /taiyi:agent architect — 技术方案对照",
    "  3. /taiyi:agent critic — 挑战 scope 与风险",
    "  4. 写入 RALPLAN.md（或更新 REQUIREMENT/TASK）",
    "  5. /taiyi:continue → /taiyi:ralph",
  ],
  ultraqa: (slug, phase) => [
    "══ Taiyi UltraQA（原生 · QA 循环）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "循环直到验收标准满足:",
    "  1. /taiyi:gstack qa · /taiyi:e2e · @taiyi-test",
    "  2. /taiyi:agent qa-tester · tracer",
    "  3. 失败 → /taiyi:agent debugger → /taiyi:ralph",
    "  4. 通过 → /taiyi:continue",
    "",
    "停止: /taiyi:stop-mode",
  ],
  "visual-verdict": (slug, phase) => [
    "══ Taiyi Visual Verdict（原生 · 视觉 QA）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "  1. /taiyi:gstack browse — 截图 before/after",
    "  2. /taiyi:agent designer — 对照 UI-DESIGN.md",
    "  3. 产出 visual-verdict.md（pass/fail + 证据路径）",
    "  4. fail → /taiyi:restyle 或 @taiyi-ui-design 修订",
  ],
  "deep-interview": (slug, phase) => [
    "══ Taiyi Deep Interview（原生 · 苏格拉底澄清）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "  1.  ambiguity 评分 ≥ 阈值则逐条追问（一次一问）",
    "  2. /taiyi:sp brainstorming",
    "  3. 澄清写入 REQUIREMENT.md AC 段",
    "  4. 无歧义 → /taiyi:plan 或 /taiyi:ralplan",
  ],
  "ai-slop-cleaner": (slug, phase) => [
    "══ Taiyi AI Slop Cleaner（原生 · 回归安全清理）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "  1. /taiyi:agent code-simplifier — 去 AI 冗余注释/过度抽象",
    "  2. 行为不变: /taiyi:ralph + /taiyi:review-check",
    "  3. 仅 dev/review 阶段；禁止改 REQUIREMENT 范围",
  ],
  ecomode: (slug, phase) => [
    "══ Taiyi Ecomode（原生 · 省 token 模式）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "  · 优先 lite profile · 跳过可选辅助 Skill",
    "  · /taiyi:token status — 超阈值先 compress",
    "  · 单 Agent 串行；不用 /taiyi:ultrawork",
    "  · 停止: /taiyi:stop-mode",
  ],
  ccg: (slug, phase) => [
    "══ Taiyi CCG（原生 · 对标 OMC ccg 多模型合成）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "三模型合成 lane（由 Agent 在宿主内执行，非 npm 内置 spawn）:",
    "  1. Codex — 实现/重构草案（consult 或独立 CLI）",
    "  2. Gemini — 对照方案/测试思路（若可用）",
    "  3. Claude — 综合 → DESIGN.md / TASK.md 修订",
    "  4. /taiyi:agent critic — 挑战合成结论",
    "  5. 定案后 /taiyi:continue · dev 用 /taiyi:tdd",
    "",
    "适用: design/task 阶段重大决策；停止: /taiyi:stop-mode",
  ],
  sciomc: (slug, phase) => [
    "══ Taiyi SciOMC（原生 · 科研/实验工作流）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "  1. /taiyi:agent scientist — 假设与可证伪实验",
    "  2. spike 代码放 .taiyi/changes/<slug>/spikes/（勿污染主分支）",
    "  3. 实验证据写入 TEST.md 或 spikes/README.md",
    "  4. /taiyi:ralph — 复现实验脚本须绿",
    "  5. 结论回写 DESIGN.md / REQUIREMENT.md AC",
  ],
  deepinit: (slug, phase) => [
    "══ Taiyi DeepInit（原生 · 分层 AGENTS 上下文）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "  1. /taiyi:intel-scan — 仓库情报 → CONTEXT.md",
    "  2. 按目录深度生成/更新 AGENTS.md 层级（根 → 包 → 模块）",
    "  3. 每级只写：边界、命令、禁忌、指向 deeper AGENTS.md",
    "  4. 不替代九阶段工件；change 阶段完成后 /taiyi:continue",
    "",
    "适用: 大 monorepo onboarding；与 /taiyi:doctor 互补",
  ],
  "external-context": (slug, phase) => [
    "══ Taiyi External Context（原生 · 对标 OMC external-context）══",
    `  slug: ${slug} · 阶段: ${phase}`,
    "",
    "  1. 列出 REQUIREMENT.md 中未覆盖的外部依赖（API/SDK/法规）",
    "  2. WebSearch / 官方文档 / MCP 拉取权威来源（注明 URL + 日期）",
    "  3. 写入 external-context.md（摘要 + 引用 + 对 AC 的影响）",
    "  4. mark-aux 或并入 REQUIREMENT.md 引用段",
    "  5. 禁止无引用断言；完成后 /taiyi:continue",
  ],
};

const WORKFLOW_MODE_MAP: Partial<Record<WorkflowSkillId, TaiyiModeId>> = {
  ralplan: "ralplan",
  plan: "plan",
  ultraqa: "ultraqa",
  ecomode: "ecomode",
  "deep-interview": "deep-interview",
  "visual-verdict": "visual-verdict",
  "ai-slop-cleaner": "ai-slop-cleaner",
};

/** workflow skill 允许激活 runtime 模式的阶段（未列出的 skill 仅打印协议） */
const SKILL_ALLOWED_PHASES: Partial<Record<WorkflowSkillId, PhaseId[]>> = {
  "deep-interview": ["change", "requirement"],
  "visual-verdict": ["ui-design", "dev", "test", "review"],
  "ai-slop-cleaner": ["dev", "review"],
  plan: ["change", "requirement", "design", "task"],
  ralplan: ["requirement", "design", "task"],
  ultraqa: ["test", "review", "integration"],
  ecomode: ["change", "requirement", "design", "ui-design", "task", "dev", "test", "review"],
};

export function runWorkflowSkill(
  engine: WorkflowEngine,
  taiyiRoot: string,
  skill: WorkflowSkillId,
  slug: string,
): WorkflowSkillResult {
  const state = engine.getState(slug);
  if (!state) {
    return {
      ok: false,
      skill,
      slug,
      phase: "change",
      text: `Change not found: ${slug}`,
    };
  }

  const phase = state.currentPhase as PhaseId;
  const mode = WORKFLOW_MODE_MAP[skill];
  const allowed = SKILL_ALLOWED_PHASES[skill];
  const phaseOk = !allowed || allowed.includes(phase);

  const lines = [...SKILL_PROTOCOL[skill](slug, phase)];

  if (mode && phaseOk) {
    activateMode(taiyiRoot, mode, slug);
  } else if (mode && !phaseOk) {
    lines.unshift(
      `⚠ ${skill} 仅适用于 ${allowed!.join("/")} 阶段（当前 ${phase}）；已跳过 runtime 激活，不会驱动 step。`,
    );
  }

  lines.push("", formatPhaseAgentsPlain(phase, slug));

  return { ok: true, skill, slug, phase, text: lines.join("\n") };
}

export function listWorkflowSkills(): WorkflowSkillId[] {
  return [
    "plan",
    "ralplan",
    "ultraqa",
    "visual-verdict",
    "deep-interview",
    "ai-slop-cleaner",
    "ecomode",
    "ccg",
    "sciomc",
    "deepinit",
    "external-context",
  ];
}
