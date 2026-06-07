import type { PhaseId } from "../core/types.js";
import {
  formatPhaseWorkflowPlain,
  getPhaseSkillFlow as getFromManifest,
  listSuperpowersFromManifest,
  resetWorkflowManifestCache,
  type PhaseSkillMap,
  type SuperpowersCatalogEntry,
} from "./workflow-manifest.js";

export type { PhaseSkillMap, SuperpowersCatalogEntry };

export function getPhaseSkillFlow(phase: PhaseId) {
  return getFromManifest(phase);
}

export function listSuperpowersSkills(): { id: string; entry: SuperpowersCatalogEntry }[] {
  return listSuperpowersFromManifest();
}

export function formatSkillFlowPlain(phase: PhaseId): string | null {
  return formatPhaseWorkflowPlain(phase);
}

export function resetSkillFlowCache(): void {
  resetWorkflowManifestCache();
}
