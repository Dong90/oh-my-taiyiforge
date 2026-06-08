import type { WorkflowEngine } from "./workflow-engine.js";
import { resolveTaiyiRoot } from "./paths.js";
import {
  formatTeamPipelinePlain,
  readTaskMd,
  readTeamState,
  resolveTeamPipelineStage,
  startTeamMode,
  ensureTeamMode,
  type TeamPipelineStage,
} from "./runtime/team-state.js";
import type { PhaseId } from "./types.js";

export type TeamStage = TeamPipelineStage;

const STAGE_PHASES: Record<TeamStage, PhaseId[]> = {
  plan: ["change", "requirement", "design", "ui-design", "task"],
  prd: ["task"],
  exec: ["dev"],
  verify: ["test", "review", "integration"],
  fix: ["dev", "test", "review"],
};

export function resolveTeamStage(phase: PhaseId): TeamStage {
  return resolveTeamPipelineStage(phase);
}

export type TeamRunResult = {
  ok: boolean;
  slug: string;
  stage: TeamStage;
  phase: PhaseId;
  text: string;
};

/** TaiyiForge 原生 team 流水线（team-plan → prd → exec → verify → fix） */
export function runTeamGuide(engine: WorkflowEngine, slug: string, taiyiRoot?: string): TeamRunResult {
  const state = engine.getState(slug);
  if (!state) {
    return {
      ok: false,
      slug,
      stage: "plan",
      phase: "change",
      text: `Change not found: ${slug}`,
    };
  }

  const phase = state.currentPhase as PhaseId;
  const root = taiyiRoot ?? engine.taiyiRoot;
  const changeDir = engine.changeDir(slug);
  const taskMd = readTaskMd(changeDir);

  const teamState = ensureTeamMode(root, slug, phase);
  const text = formatTeamPipelinePlain(teamState, taskMd);

  return { ok: true, slug, stage: teamState.stage, phase, text };
}

export function getTeamStatus(engine: WorkflowEngine, taiyiRoot: string, slug?: string): string {
  const team = readTeamState(taiyiRoot);
  if (!team?.active) return "Team 未激活";
  if (slug && team.slug !== slug) return `Team 激活于 ${team.slug}（非 ${slug}）`;
  const taskMd = team.slug ? readTaskMd(engine.changeDir(team.slug)) : undefined;
  return formatTeamPipelinePlain(team, taskMd);
}
