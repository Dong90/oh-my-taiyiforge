import type { PhaseId } from "../types.js";
import { AUXILIARY_ARTIFACTS } from "../auxiliary-artifacts.js";
import { getWorkflowManifest } from "../../integrations/workflow-manifest.js";

function knownAuxiliarySet(): Set<string> {
  return new Set(Object.keys(AUXILIARY_ARTIFACTS));
}

/** Auxiliary taiyi-* skills that may be recorded via mark-aux. */
export const KNOWN_AUXILIARY_SKILLS = knownAuxiliarySet();

export function isKnownAuxiliarySkill(skillId: string): boolean {
  return knownAuxiliarySet().has(skillId);
}

export function auxiliarySkillHomePhase(skillId: string): PhaseId | undefined {
  const hit = getWorkflowManifest().auxiliary_skills.find((a) => a.id === skillId);
  return hit?.phases[0];
}
