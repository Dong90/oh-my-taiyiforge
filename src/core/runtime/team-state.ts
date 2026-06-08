import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../types.js";
import {
  deactivateMode,
  readModeState,
  writeModeState,
  type ModeStateBase,
} from "./mode-state.js";
import { buildSpawnPlan, formatSpawnPlanPlain } from "./spawn-delegation.js";

/** team-plan → team-prd → team-exec → team-verify → team-fix（对标 OMC team pipeline） */
export type TeamPipelineStage = "plan" | "prd" | "exec" | "verify" | "fix";

export type TeamModeState = ModeStateBase & {
  stage: TeamPipelineStage;
  fixRound: number;
  maxFixRounds: number;
  phase: PhaseId;
};

const DEFAULT_MAX_FIX = 5;

export function defaultMaxFixRounds(): number {
  return Number(process.env.TAIYI_TEAM_MAX_FIX ?? String(DEFAULT_MAX_FIX));
}

export function resolveTeamPipelineStage(phase: PhaseId): TeamPipelineStage {
  if (["change", "requirement", "design", "ui-design"].includes(phase)) return "plan";
  if (phase === "task") return "prd";
  if (phase === "dev") return "exec";
  if (["test", "review", "integration"].includes(phase)) return "verify";
  return "plan";
}

export function readTeamState(taiyiRoot: string): TeamModeState | null {
  return readModeState<TeamModeState>(taiyiRoot, "team");
}

export function startTeamMode(
  taiyiRoot: string,
  slug: string,
  phase: PhaseId,
): TeamModeState {
  const stage = resolveTeamPipelineStage(phase);
  const state: TeamModeState = {
    active: true,
    slug,
    stage,
    phase,
    fixRound: 0,
    maxFixRounds: defaultMaxFixRounds(),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeModeState(taiyiRoot, "team", state);
  return state;
}

/** 已有 team 且 slug 一致时保留 fixRound/泳道，避免重复 /taiyi:team 重置进度 */
export function ensureTeamMode(
  taiyiRoot: string,
  slug: string,
  phase: PhaseId,
): TeamModeState {
  const prev = readTeamState(taiyiRoot);
  if (prev?.active && prev.slug === slug) {
    const stageFromPhase = resolveTeamPipelineStage(phase);
    const state: TeamModeState = {
      ...prev,
      phase,
      stage: prev.stage === "fix" ? "fix" : stageFromPhase,
      updatedAt: new Date().toISOString(),
    };
    writeModeState(taiyiRoot, "team", state);
    return state;
  }
  return startTeamMode(taiyiRoot, slug, phase);
}

export function advanceTeamStage(
  taiyiRoot: string,
  next: TeamPipelineStage,
): TeamModeState | null {
  const prev = readTeamState(taiyiRoot);
  if (!prev?.active) return null;
  const state: TeamModeState = {
    ...prev,
    stage: next,
    updatedAt: new Date().toISOString(),
  };
  writeModeState(taiyiRoot, "team", state);
  return state;
}

export function bumpTeamFixRound(taiyiRoot: string): TeamModeState | null {
  const prev = readTeamState(taiyiRoot);
  if (!prev?.active) return null;
  const state: TeamModeState = {
    ...prev,
    fixRound: prev.fixRound + 1,
    stage: "fix",
    updatedAt: new Date().toISOString(),
  };
  writeModeState(taiyiRoot, "team", state);
  return state;
}

export function stopTeamMode(taiyiRoot: string, preserve = false): void {
  deactivateMode(taiyiRoot, "team", preserve ? { preserve: true } : undefined);
}

const STAGE_PROTOCOL: Record<TeamPipelineStage, string[]> = {
  plan: [
    "Team · plan — 规划泳道",
    "  并行: /taiyi:agent explore · analyst · architect",
    "  1. /taiyi:explore · @taiyi-change · @taiyi-requirement · @taiyi-design",
    "  2. /taiyi:plan 或 /taiyi:ralplan — 结构化计划",
    "  3. 工件就绪 → /taiyi:continue → team-prd",
  ],
  prd: [
    "Team · prd — 需求与切片",
    "  并行: /taiyi:agent planner · test-engineer · document-specialist",
    "  1. @taiyi-requirement · @taiyi-task",
    "  2. /taiyi:tdd plan",
    "  3. TASK.md 独立切片 → /taiyi:continue → team-exec",
  ],
  exec: [
    "Team · exec — 实现泳道",
    "  1. /taiyi:ultrawork — spawn 计划（见下方）",
    "  2. /taiyi:tdd dev · /taiyi:ralph 直至验证绿",
    "  3. /taiyi:continue → team-verify",
  ],
  verify: [
    "Team · verify — 验证泳道",
    "  并行: verifier · qa-tester · code-reviewer · security-reviewer",
    "  1. /taiyi:e2e · /taiyi:gstack qa · @taiyi-test",
    "  2. /taiyi:security · /taiyi:review-loop",
    "  3. 失败 → team-fix · 通过 → /taiyi:continue",
  ],
  fix: [
    "Team · fix — 修复泳道",
    "  1. /taiyi:agent debugger · executor",
    "  2. 最小修复 → /taiyi:ralph",
    "  3. 通过后回到 team-verify",
  ],
};

export function formatTeamPipelinePlain(
  state: TeamModeState,
  taskMd?: string,
): string {
  const lines = [
    "══ Taiyi Team 流水线（原生 · 自 OMC 迁移）══",
    `  slug: ${state.slug} · 阶段 ${state.phase} → 泳道 **${state.stage}**`,
    `  fix 轮次: ${state.fixRound}/${state.maxFixRounds}`,
    "",
    ...STAGE_PROTOCOL[state.stage],
  ];

  if (state.stage === "exec" && state.slug) {
    const plan = buildSpawnPlan(state.slug, state.phase, taskMd);
    lines.push("", formatSpawnPlanPlain(plan));
  }

  lines.push("", "状态: .taiyi/runtime/team-mode.json");
  lines.push("停止: /taiyi:stop-mode [--force]");
  return lines.join("\n");
}

export function readTaskMd(changeDir: string): string | undefined {
  const p = path.join(changeDir, "TASK.md");
  if (!fs.existsSync(p)) return undefined;
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return undefined;
  }
}
