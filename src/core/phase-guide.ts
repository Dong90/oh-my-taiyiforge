import fs from "node:fs";
import path from "node:path";
import type { ChangeState, PhaseId } from "./types.js";
import { getPhase, getNextPhase } from "./phase-registry.js";
import {
  artifactPathForPhase,
  validateArtifactFile,
} from "./artifact-validator.js";
import type { HarnessContext } from "../integrations/harness-hooks.js";
import { getHarnessContext } from "../integrations/harness-hooks.js";
import {
  auxiliaryForPhase,
  pendingAuxiliary,
} from "./routing/auxiliary-hints.js";
import { inferComplexitySignals } from "./routing/infer-complexity.js";
import type { ComplexitySignals } from "./routing/complexity.js";
import { requiresHumanGate } from "./gates/human-gate-config.js";
import { expectedPhaseCount, isWorkflowCompleted } from "./change-status.js";
import { buildTokenBudgetSummary } from "./token-runner.js";
import { normalizeState } from "./normalize-state.js";

export type PhaseGuide = {
  slug: string;
  profile: ChangeState["profile"];
  skippedPhases: PhaseId[];
  currentPhase: ChangeState["currentPhase"];
  workflowCompleted: boolean;
  completedCount: number;
  totalPhases: number;
  skill: string;
  artifact: string;
  artifactPath: string;
  artifactExists: boolean;
  qualityReady: boolean;
  qualityHints: string[];
  nextAction: string;
  nextPhase: string | null;
  nextSkill: string | null;
  requiresHumanGate: boolean;
  complexity?: ChangeState["complexity"];
  /** 从 CHANGE/REQUIREMENT 推断的意图信号（架构图「意图分析」） */
  intentSignals?: ComplexitySignals;
  recommendedAuxiliary: string[];
  pendingAuxiliary: string[];
  auxiliaryCompleted: string[];
  autoHarness: boolean;
  harness?: HarnessContext;
  /** Token 预算摘要行（status/guide） */
  tokenBudgetLine?: string;
  tokenWarnings?: string[];
};

export function buildPhaseGuide(
  taiyiRoot: string,
  slug: string,
  rawState: ChangeState,
  workspaceDir?: string,
): PhaseGuide {
  const state = normalizeState(rawState);
  const phase = getPhase(state.currentPhase);
  const changeDir = path.join(taiyiRoot, "changes", slug);
  const artifactPath = artifactPathForPhase(changeDir, state.currentPhase);
  const artifactExists =
    fs.existsSync(artifactPath) && fs.statSync(artifactPath).size > 0;

  let qualityReady = false;
  let qualityHints: string[] = [];

  if (artifactExists && phase.kind === "markdown") {
    const v = validateArtifactFile(artifactPath, state.currentPhase);
    if (v) {
      qualityHints = v.hints;
      qualityReady = Object.values(v.scores).every(Boolean);
    }
  } else if (artifactExists && phase.kind === "code") {
    qualityReady = true;
  } else {
    qualityHints = [`创建并填写工件: ${artifactPath}`];
  }

  const next = getNextPhase(state.currentPhase, state.skippedPhases);
  const nextPhaseDef = next ? getPhase(next) : null;
  const totalPhases = expectedPhaseCount(state);
  const allDone = isWorkflowCompleted(state);

  const recommendedAuxiliary = auxiliaryForPhase(
    state.currentPhase,
    state.complexity,
  );
  const pending = pendingAuxiliary(recommendedAuxiliary, state.auxiliaryCompleted);
  const humanGate = requiresHumanGate(state.currentPhase);
  const intentSignals = inferComplexitySignals(changeDir);

  let nextAction: string;
  const harness =
    workspaceDir != null
      ? getHarnessContext(workspaceDir, slug, state.currentPhase)
      : undefined;

  const guideBase = {
    workflowCompleted: allDone,
    completedCount: state.completedPhases.length,
    totalPhases,
  };

  const attachToken = (guide: PhaseGuide): PhaseGuide => {
    const token = buildTokenBudgetSummary(changeDir, slug, state.currentPhase);
    return {
      ...guide,
      tokenBudgetLine: token.line,
      tokenWarnings: token.evalResult.warnings,
    };
  };

  if (allDone) {
    return attachToken({
      ...guideBase,
      slug,
      profile: state.profile,
      skippedPhases: state.skippedPhases,
      currentPhase: state.currentPhase,
      skill: phase.skill,
      artifact: phase.artifact,
      artifactPath,
      artifactExists,
      qualityReady: true,
      qualityHints: [],
      nextAction:
        "九阶段已完成 → /taiyi:archive（可选 sync-openspec）",
      nextPhase: null,
      nextSkill: null,
      requiresHumanGate: false,
      complexity: state.complexity,
      intentSignals,
      recommendedAuxiliary: [],
      pendingAuxiliary: [],
      auxiliaryCompleted: state.auxiliaryCompleted,
      autoHarness: state.autoHarness ?? false,
      harness,
    });
  }

  const auxNote = pending.length > 0 ? `（可选辅助：${pending.join(", ")}）` : "";

  if (!artifactExists) {
    const pre =
      pending.length > 0 && state.currentPhase === "change"
        ? `建议先运行辅助 Skill：${pending.join(", ")}，再`
        : "";
    nextAction = `${pre}加载 Skill「${phase.skill}」，编辑 ${phase.artifact}`;
  } else if (!qualityReady) {
    nextAction = `完善 ${phase.artifact}（见 qualityHints），再 /taiyi:continue`;
  } else if (humanGate) {
    nextAction = `人工确认后 /taiyi:continue${auxNote}`;
  } else {
    nextAction = `工件就绪，执行 /taiyi:continue${auxNote}`;
  }

  if (
    state.currentPhase === "review" &&
    state.complexity?.level === "high" &&
    !state.auxiliaryCompleted.includes("taiyi-health")
  ) {
    nextAction = `high 复杂度：先 taiyi-health → mark-aux，再 /taiyi:review-loop`;
  } else if (state.currentPhase === "review") {
    nextAction = `/taiyi:review-loop（会话内循环 review 直到机器审查通过）→ 通过后 complete review --approver`;
  } else if (state.autoHarness) {
    nextAction = `全自动：harness 清单 → 铁三角打卡 → /taiyi:continue`;
  } else if (state.currentPhase === "dev" || state.currentPhase === "test") {
    nextAction = `加载 ${phase.skill}，实现后 /taiyi:apply 或 /taiyi:continue`;
  }

  return attachToken({
    ...guideBase,
    slug,
    profile: state.profile,
    skippedPhases: state.skippedPhases,
    currentPhase: state.currentPhase,
    skill: phase.skill,
    artifact: phase.artifact,
    artifactPath,
    artifactExists,
    qualityReady,
    qualityHints,
    nextAction,
    nextPhase: next,
    nextSkill: nextPhaseDef?.skill ?? null,
    requiresHumanGate: humanGate,
    complexity: state.complexity,
    intentSignals,
    recommendedAuxiliary,
    pendingAuxiliary: pending,
    auxiliaryCompleted: state.auxiliaryCompleted,
    autoHarness: state.autoHarness ?? false,
    harness,
  });
}
