import type { ChangeProfile, PhaseId } from "./types.js";

/** Phases skipped per profile (treated as satisfied for dependencies). */
export const PROFILE_SKIPPED: Record<ChangeProfile, PhaseId[]> = {
  full: [],
  api: ["ui-design"],
  /** Alias of `full` — explicit UI-heavy naming; same nine phases. */
  ui: [],
  lite: ["design", "ui-design", "task", "review"],
};

export function skippedPhasesForProfile(profile: ChangeProfile): PhaseId[] {
  return [...PROFILE_SKIPPED[profile]];
}

export function isPhaseSkipped(phaseId: PhaseId, skipped: PhaseId[]): boolean {
  return skipped.includes(phaseId);
}
