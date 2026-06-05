import type { PhaseId } from "../types.js";
import type { ComplexityAssessment } from "../types.js";

const AUX_BY_PHASE: Partial<Record<PhaseId, string[]>> = {
  change: ["taiyi-intel-scan"],
  design: ["taiyi-architect"],
  "ui-design": ["taiyi-restyle"],
  test: ["taiyi-evolve"],
  review: ["taiyi-health"],
};

export function auxiliaryForPhase(
  phaseId: PhaseId,
  assessment?: ComplexityAssessment,
): string[] {
  const set = new Set<string>(AUX_BY_PHASE[phaseId] ?? []);
  if (assessment) {
    for (const s of assessment.recommendedSkills) set.add(s);
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
