import type { ChangeState } from "./types.js";

export function expectedPhaseCount(state: ChangeState): number {
  return 9 - (state.skippedPhases?.length ?? 0);
}

/** 九阶段（含 profile 跳过）是否已全部完成 */
export function isWorkflowCompleted(state: ChangeState): boolean {
  if (state.workflowStatus === "completed") return true;
  const total = expectedPhaseCount(state);
  return (
    state.completedPhases.length >= total &&
    state.completedPhases.includes("integration")
  );
}

export function displayPhase(state: ChangeState): string {
  return isWorkflowCompleted(state) ? "completed" : state.currentPhase;
}
