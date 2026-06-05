import type { PhaseId } from "../types.js";
import type { ComplexityAssessment } from "../types.js";

const AUX_BY_PHASE: Partial<Record<PhaseId, string[]>> = {
  change: ["taiyi-intel-scan"],
  design: ["taiyi-architect"],
  "ui-design": ["taiyi-restyle"],
  test: ["taiyi-evolve"],
  review: ["taiyi-health"],
};

/** 复杂度推荐 Skill 仅在其所属阶段生效，避免 change 阶段误要求 adr/ */
const AUX_HOME_PHASE: Record<string, PhaseId> = {
  "taiyi-intel-scan": "change",
  "taiyi-architect": "design",
  "taiyi-restyle": "ui-design",
  "taiyi-evolve": "test",
  "taiyi-health": "review",
};

export function auxiliaryForPhase(
  phaseId: PhaseId,
  assessment?: ComplexityAssessment,
): string[] {
  const set = new Set<string>(AUX_BY_PHASE[phaseId] ?? []);
  if (assessment) {
    for (const s of assessment.recommendedSkills) {
      const home = AUX_HOME_PHASE[s];
      if (!home || home === phaseId) set.add(s);
    }
  }
  return [...set];
}

export function pendingAuxiliary(
  suggested: string[],
  auxiliaryCompleted: string[],
): string[] {
  const done = new Set(auxiliaryCompleted);
  return suggested.filter((s) => !done.has(s));
}
