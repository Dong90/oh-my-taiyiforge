import type { PhaseId } from "../types.js";
import type { ComplexityAssessment } from "../types.js";
import {
  auxiliaryForPhaseFromManifest,
  auxiliaryHomePhaseFromManifest,
} from "../../integrations/workflow-manifest.js";

export function auxiliaryForPhase(
  phaseId: PhaseId,
  assessment?: ComplexityAssessment,
): string[] {
  const set = new Set<string>(auxiliaryForPhaseFromManifest(phaseId));
  if (assessment?.recommendedSkills) {
    for (const s of assessment.recommendedSkills) {
      const home = auxiliaryHomePhaseFromManifest(s);
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
