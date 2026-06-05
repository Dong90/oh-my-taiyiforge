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
import { requiresHumanGate } from "./gates/human-gate-config.js";

export type PhaseGuide = {
  slug: string;
  profile: ChangeState["profile"];
  skippedPhases: PhaseId[];
  currentPhase: ChangeState["currentPhase"];
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
  recommendedAuxiliary: string[];
  pendingAuxiliary: string[];
  auxiliaryCompleted: string[];
  autoHarness: boolean;
  harness?: HarnessContext;
};

export function buildPhaseGuide(
  taiyiRoot: string,
  slug: string,
  rawState: ChangeState,
  workspaceDir?: string,
): PhaseGuide {
  const state: ChangeState = {
    ...rawState,
    profile: rawState.profile ?? "full",
    skippedPhases: rawState.skippedPhases ?? [],
    strictDev: rawState.strictDev ?? false,
    auxiliaryCompleted: rawState.auxiliaryCompleted ?? [],
  };
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
  const expectedDone = 9 - state.skippedPhases.length;
  const allDone =
    !next &&
    state.completedPhases.includes(state.currentPhase) &&
    state.completedPhases.length >= expectedDone;

  const recommendedAuxiliary = auxiliaryForPhase(
    state.currentPhase,
    state.complexity,
  );
  const pending = pendingAuxiliary(recommendedAuxiliary, state.auxiliaryCompleted);
  const humanGate = requiresHumanGate(state.currentPhase);

  let nextAction: string;
  const harness =
    workspaceDir != null
      ? getHarnessContext(workspaceDir, slug, state.currentPhase)
      : undefined;

  if (allDone) {
    return {
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
        "九阶段已完成，可 taiyi sync-openspec / taiyi archive，或 taiyi init 开新 slug",
      nextPhase: null,
      nextSkill: null,
      requiresHumanGate: false,
      complexity: state.complexity,
      recommendedAuxiliary: [],
      pendingAuxiliary: [],
      auxiliaryCompleted: state.auxiliaryCompleted,
      autoHarness: state.autoHarness ?? false,
      harness,
    };
  }

  const auxNote = pending.length > 0 ? `（可选辅助：${pending.join(", ")}）` : "";

  if (!artifactExists) {
    const pre =
      pending.length > 0 && state.currentPhase === "change"
        ? `建议先运行辅助 Skill：${pending.join(", ")}，再`
        : "";
    nextAction = `${pre}加载 Skill「${phase.skill}」，编辑 ${phase.artifact}`;
  } else if (!qualityReady) {
    nextAction = `完善 ${phase.artifact}（见 qualityHints），再执行 complete ${state.currentPhase}`;
  } else if (humanGate) {
    nextAction = `人工确认后执行: taiyi complete ${slug} ${state.currentPhase}${auxNote}`;
  } else {
    nextAction = `工件就绪，可直接: taiyi complete ${slug} ${state.currentPhase}${auxNote}`;
  }

  if (
    state.currentPhase === "review" &&
    state.complexity?.level === "high" &&
    !state.auxiliaryCompleted.includes("taiyi-health")
  ) {
    nextAction = `high 复杂度：先 taiyi-health → taiyi mark-aux ${slug} taiyi-health，再 complete review`;
  } else if (state.autoHarness) {
    nextAction = `全自动：npx taiyi harness ${slug} → 按清单执行铁三角与辅助 → complete ${state.currentPhase}`;
  }

  return {
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
    recommendedAuxiliary,
    pendingAuxiliary: pending,
    auxiliaryCompleted: state.auxiliaryCompleted,
    autoHarness: state.autoHarness ?? false,
    harness,
  };
}
