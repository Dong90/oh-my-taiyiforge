import fs from "node:fs";
import path from "node:path";
import type { ChangeState } from "./types.js";
import { resolveChangeDir } from "./taiyi-archive.js";
import { normalizeState } from "./normalize-state.js";

export function expectedPhaseCount(state: ChangeState): number {
  return 9 - (state.skippedPhases?.length ?? 0);
}

function structurallyCompleted(state: ChangeState): boolean {
  const total = expectedPhaseCount(state);
  return (
    state.completedPhases.length >= total &&
    state.completedPhases.includes("integration")
  );
}

/** 九阶段（含 profile 跳过）是否已全部完成 */
export function isWorkflowCompleted(state: ChangeState): boolean {
  if (structurallyCompleted(state)) return true;
  // 手改 workflowStatus 仍须 integration 在 completedPhases，避免假完成
  if (state.workflowStatus === "completed") {
    return state.completedPhases.includes("integration");
  }
  return false;
}

export function isChangeAborted(state: ChangeState): boolean {
  return state.workflowStatus === "aborted";
}

/** 可 continue / apply 的进行中变更 */
export function isChangeActive(state: ChangeState): boolean {
  return !isWorkflowCompleted(state) && !isChangeAborted(state);
}

export function displayPhase(state: ChangeState): string {
  if (isChangeAborted(state)) return "aborted";
  if (isWorkflowCompleted(state)) return "completed";
  return state.currentPhase;
}

export function workflowPhaseLabelFromState(state: ChangeState): string {
  const n = expectedPhaseCount(state);
  if (n === 5) return "五阶段";
  if (n === 9) return "九阶段";
  return `${n} 阶段`;
}

/** continue / apply / loop 完成态统一文案 */
export function completedWorkflowMessage(state: ChangeState): string {
  return `${workflowPhaseLabelFromState(state)}已全部完成`;
}

export function loadChangeState(taiyiRoot: string, slug: string): ChangeState | null {
  const dir = resolveChangeDir(taiyiRoot, slug);
  if (!dir) return null;
  const p = path.join(dir, "state.json");
  if (!fs.existsSync(p)) return null;
  try {
    return normalizeState(JSON.parse(fs.readFileSync(p, "utf8")) as ChangeState);
  } catch {
    return null;
  }
}

export function isSlugWorkflowCompleted(taiyiRoot: string, slug: string): boolean {
  const state = loadChangeState(taiyiRoot, slug);
  return state ? isWorkflowCompleted(state) : false;
}
