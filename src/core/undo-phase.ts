import fs from "node:fs";
import path from "node:path";
import type { ChangeState, PhaseId } from "./types.js";
import { getPhaseOrder, listPhases } from "./phase-registry.js";
import { logActivity } from "./activity-log.js";
import { getLogger } from "./logger.js";
import type { WorkflowEngine } from "./workflow-engine.js";
import { formatChangeNotFound } from "./cli-hints.js";

const log = getLogger();

export type UndoPhaseResult =
  | { ok: true; undone: PhaseId[]; currentPhase: PhaseId }
  | { ok: false; error: string };

/**
 * 回滚指定阶段（及其后完成的所有阶段）。
 *
 * 语义：
 * - 不传 targetPhase：回滚最后一个完成的阶段
 * - 传 targetPhase：回滚 targetPhase 及之后完成的全部阶段
 *   （targetPhase 将成为新的 currentPhase，可重新实现）
 *
 * 约束：
 * - 不能回滚 workflow 已完成/已取消的变更
 * - 不能回滚 change 阶段（九阶段基石）
 * - targetPhase 必须在 completedPhases 中
 */
export function undoPhase(
  engine: WorkflowEngine,
  taiyiRoot: string,
  slug: string,
  targetPhase?: PhaseId,
): UndoPhaseResult {
  const state = engine.getState(slug);
  if (!state) {
    return { ok: false, error: formatChangeNotFound(slug) };
  }

  if (state.workflowStatus === "completed") {
    return { ok: false, error: `变更 ${slug} 已完成，归档后不可回滚` };
  }
  if (state.workflowStatus === "aborted") {
    return { ok: false, error: `变更 ${slug} 已取消 (aborted)，无法回滚` };
  }

  const completed = [...state.completedPhases];
  if (completed.length === 0) {
    return { ok: false, error: "无已完成阶段，无可回滚" };
  }

  // 按 order 排序，确保顺序正确
  const sorted = [...completed].sort(
    (a, b) => getPhaseOrder(a) - getPhaseOrder(b),
  );

  // 决定回滚到哪个阶段
  let target = targetPhase;
  if (!target) {
    // 未指定 → 回滚最后一个完成的阶段
    target = sorted[sorted.length - 1]!;
  }

  // 校验 targetPhase 必须在 completedPhases 中
  if (!completed.includes(target)) {
    const hint =
      completed.length >= 2
        ? `已完成: ${completed.join(", ")}`
        : `已完成: ${completed[0] ?? "无"}`;
    return {
      ok: false,
      error: `阶段「${target}」尚未完成（${hint}）。示例: undo ${slug} ${sorted[sorted.length - 2] ?? sorted[0] ?? target}`,
    };
  }

  // 不许回滚 change（基石）
  if (target === "change") {
    return { ok: false, error: "change 阶段是九阶段基石，不可回滚" };
  }

  // 找出要从 completed 中移除的阶段：target 及 order >= target 的全部
  const targetOrder = getPhaseOrder(target);
  const toUndo = sorted.filter((p) => getPhaseOrder(p) >= targetOrder);

  // 保护：change 不可能在 toUndo 中（order 最低），但防御性检查保留
  if (toUndo.includes("change" as PhaseId)) {
    return { ok: false, error: "change 阶段不可回滚（内部保护）" };
  }

  const changeDir = engine.changeDir(slug);

  // 移除工件文件
  for (const phase of toUndo) {
    const phaseDef = listPhases().find((p) => p.id === phase);
    if (!phaseDef) continue;

    if (phaseDef.kind === "markdown") {
      const artifactPath = path.join(changeDir, phaseDef.artifact);
      if (fs.existsSync(artifactPath)) {
        fs.unlinkSync(artifactPath);
        log.info("Removed artifact", { slug, phase, artifact: phaseDef.artifact });
      }
    } else if (phaseDef.kind === "code") {
      // code 阶段（dev）— 清理 .dev-complete
      const devPath = path.join(changeDir, ".dev-complete");
      if (fs.existsSync(devPath)) {
        fs.unlinkSync(devPath);
        log.info("Removed code artifact", { slug, phase, artifact: ".dev-complete" });
      }
    }
  }

  const newCompleted = sorted.filter((p) => !toUndo.includes(p));
  const newState: ChangeState = {
    ...state,
    currentPhase: target,
    completedPhases: newCompleted,
    updatedAt: new Date().toISOString(),
  };

  // 写 state.json（绕过 engine.writeState 的 private 限制和 completePhase 门禁）
  const statePath = path.join(taiyiRoot, "changes", slug, "state.json");
  if (!fs.existsSync(statePath)) {
    return { ok: false, error: `state.json 不存在: ${statePath}` };
  }

  // OCC: 读现有版本号并递增（与 engine.writeState 逻辑一致）
  let existingVersion = 0;
  try {
    const existing = JSON.parse(fs.readFileSync(statePath, "utf8")) as ChangeState;
    existingVersion = existing.version ?? 0;
  } catch {
    // 文件损坏 — 仍允许回滚（version 保持 0）
  }
  newState.version = existingVersion + 1;

  const tmp = `${statePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(newState, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, statePath);

  log.info("Undo phases: state written", { slug, version: newState.version });

  logActivity(taiyiRoot, {
    event: "phase:undone",
    slug,
    phases: toUndo,
    newPhase: target,
  });

  log.info("Undo phases", { slug, undone: toUndo, currentPhase: target });
  return { ok: true, undone: toUndo, currentPhase: target };
}

export function formatUndoPlain(slug: string, result: UndoPhaseResult): string {
  if (!result.ok) return `undo 失败: ${result.error}`;
  return [
    `✓ 已回滚 ${slug}：`,
    `  回退阶段: ${result.undone.join(" → ")}`,
    `  当前阶段: ${result.currentPhase}`,
    `  可重新实现后 continue 过关`,
  ].join("\n");
}
