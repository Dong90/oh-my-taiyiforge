import fs from "node:fs";
import path from "node:path";
import type { ChangeProfile, PhaseId } from "./types.js";

/** Phases skipped per profile (treated as satisfied for dependencies). */
export const PROFILE_SKIPPED: Record<ChangeProfile, PhaseId[]> = {
  full: [],
  api: ["ui-design"],
  ui: [],
  lite: ["design", "ui-design", "task", "review"],
  spike: ["requirement", "design", "ui-design", "task", "review"],
  micro: ["requirement", "design", "ui-design", "task", "test", "review"],
  nano: ["change", "requirement", "design", "ui-design", "task", "test", "review"],
};

export function skippedPhasesForProfile(profile: ChangeProfile): PhaseId[] {
  return [...PROFILE_SKIPPED[profile]];
}

export function isPhaseSkipped(phaseId: PhaseId, skipped: PhaseId[]): boolean {
  return skipped.includes(phaseId);
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
