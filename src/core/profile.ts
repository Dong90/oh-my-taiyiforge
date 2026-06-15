import type { ChangeProfile, PhaseId } from "./types.js";

/** Phases skipped per profile (treated as satisfied for dependencies). */
export const PROFILE_SKIPPED: Record<ChangeProfile, PhaseId[]> = {
  full: [],
  api: ["ui-design"],
  /** Alias of `full` — explicit UI-heavy naming; same nine phases. */
  ui: [],
  lite: ["design", "ui-design", "task", "review"],
  /** MVP / 创业验证：跳过规划与设计，保留测试与交付 */
  spike: ["requirement", "design", "ui-design", "task", "review"],
  /** 个人工具 / 脚本：最小路径 change → dev → integration */
  micro: ["requirement", "design", "ui-design", "task", "test", "review"],
  /** 最简变更：跳过所有文档阶段，dev → integration 直出 */
  nano: ["change", "requirement", "design", "ui-design", "task", "test", "review"],
};

export function skippedPhasesForProfile(profile: ChangeProfile): PhaseId[] {
  return [...PROFILE_SKIPPED[profile]];
}

export function isPhaseSkipped(phaseId: PhaseId, skipped: PhaseId[]): boolean {
  return skipped.includes(phaseId);
}
