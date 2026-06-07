import type { ChangeState } from "./types.js";

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
