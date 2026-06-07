import type { ChangeState } from "./types.js";
import type { PhaseGuide } from "./phase-guide.js";
import { displayPhase, isChangeActive } from "./change-status.js";

/** 对标 OMC state_get_status — 引擎真源一行看清 */
export type EngineTruth = {
  slug: string;
  workflowStatus: NonNullable<ChangeState["workflowStatus"]>;
  displayPhase: string;
  currentPhase: ChangeState["currentPhase"];
  completedPhases: ChangeState["currentPhase"][];
  completedCount: number;
  totalPhases: number;
  profile: ChangeState["profile"];
  autoHarness: boolean;
  workflowActive: boolean;
  artifact: string;
  skill: string;
  qualityReady: boolean;
  requiresHumanGate: boolean;
  nextAction: string;
  blockers: string[];
  syncActions: string[];
  earlyCodeWarning?: string;
  handoffExists?: boolean;
};

export function buildEngineTruth(
  state: ChangeState,
  guide: PhaseGuide,
  options?: { handoffExists?: boolean },
): EngineTruth {
  return {
    slug: state.slug,
    workflowStatus: state.workflowStatus ?? "active",
    displayPhase: displayPhase(state),
    currentPhase: state.currentPhase,
    completedPhases: state.completedPhases,
    completedCount: guide.completedCount,
    totalPhases: guide.totalPhases,
    profile: state.profile,
    autoHarness: state.autoHarness ?? false,
    workflowActive: isChangeActive(state),
    artifact: guide.artifact,
    skill: guide.skill,
    qualityReady: guide.qualityReady,
    requiresHumanGate: guide.requiresHumanGate,
    nextAction: guide.nextAction,
    blockers: guide.stepBlockers ?? [],
    syncActions: guide.syncActions ?? [],
    earlyCodeWarning: guide.earlyCodeWarning,
    handoffExists: options?.handoffExists,
  };
}
