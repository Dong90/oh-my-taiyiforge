import fs from "node:fs";
import path from "node:path";
import type { ArchTemplateId, ArchitectureTemplate, ChangeProfile, PhaseId } from "./types.js";
import { detectArchTemplate, getArchTemplate } from "./arch-templates.js";
import { getDefaultRegistry, resolveProfile } from "./profile-registry.js";

/** @deprecated Use `skippedPhasesForProfile(id)` instead — it queries the live
 *  registry and recognizes profiles added after module load (via
 *  `registerProfile` / `loadProfilesFromYaml` / `loadProfilesFromNodeModules`).
 *  This snapshot is frozen at module-load time and will only see builtin profiles. */
function buildProfileSkippedMap(): Record<string, PhaseId[]> {
  const reg = getDefaultRegistry();
  const out: Record<string, PhaseId[]> = {};
  for (const def of reg.list()) {
    out[def.id] = [...def.skipPhases];
  }
  return out;
}

export const PROFILE_SKIPPED: Record<ChangeProfile, PhaseId[]> =
  buildProfileSkippedMap() as Record<ChangeProfile, PhaseId[]>;

/** Look up skipPhases for any profile id (builtin or custom). Delegates to registry
 *  so custom profiles registered after module load are recognized. */
export function skippedPhasesForProfile(profile: ChangeProfile): PhaseId[] {
  const r = resolveProfile(profile);
  return r.ok ? [...r.value.skipPhases] : [];
}

export function isPhaseSkipped(phaseId: PhaseId, skipped: PhaseId[]): boolean {
  return skipped.includes(phaseId);
}

/** resolveArchTemplate: return ArchitectureTemplate for a change given profile + workspace.
 *  改后委托 registry 算 arch 字段。arch="auto" 时回退到 detectArchTemplate。 */
export function resolveArchTemplateForChange(
  profile: ChangeProfile,
  workspaceDir: string,
): ArchitectureTemplate {
  const r = resolveProfile(profile);
  const archId = r.ok ? r.value.arch : "auto";
  if (archId === "auto") {
    return getArchTemplate(detectArchTemplate(workspaceDir));
  }
  return getArchTemplate(archId as ArchTemplateId);
}

import { isSeedTemplate } from "./seed-marker.js";

const UI_KEYWORDS = /\b(UI|UX|界面|前端|组件|样式|布局|颜色|字体|动画|响应式|Figma|CSS|HTML|React|Vue|Svelte|组件库|设计稿|wireframe|mockup|视觉|交互|hover|button|dialog|modal|sidebar|navbar|page|screen|form)\b/i;

/** Check if a change directory's CHANGE.md suggests UI work */
export function changeHasUiSignals(changeDir: string): boolean {
  const changePath = path.join(changeDir, "CHANGE.md");
  try {
    if (!fs.existsSync(changePath)) return false;
    const content = fs.readFileSync(changePath, "utf8");
    if (isSeedTemplate(content)) return true; // template → assume UI possible until user edits
    return UI_KEYWORDS.test(content);
  } catch {
    return false;
  }
}

// Force-load builtin profiles on module import so PROFILE_SKIPPED is ready immediately.
// （避免第一次访问 PROFILE_SKIPPED["xxx"] 时 lazy load 的 timing 问题）
getDefaultRegistry();
