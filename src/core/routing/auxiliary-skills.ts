import type { PhaseId } from "../types.js";

/** Auxiliary taiyi-* skills that may be recorded via mark-aux. */
export const KNOWN_AUXILIARY_SKILLS = new Set<string>([
  "taiyi-intel-scan",
  "taiyi-architect",
  "taiyi-restyle",
  "taiyi-evolve",
  "taiyi-health",
]);

export function isKnownAuxiliarySkill(skillId: string): boolean {
  return KNOWN_AUXILIARY_SKILLS.has(skillId);
}

export function auxiliarySkillHomePhase(skillId: string): PhaseId | undefined {
  const map: Record<string, PhaseId> = {
    "taiyi-intel-scan": "change",
    "taiyi-architect": "design",
    "taiyi-restyle": "ui-design",
    "taiyi-evolve": "test",
    "taiyi-health": "review",
  };
  return map[skillId];
}
