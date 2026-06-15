import fs from "node:fs";
import path from "node:path";
import { resolveChangeDir } from "../taiyi-archive.js";
import { isWorkflowCompleted, loadChangeState } from "../change-status.js";
import type { PhaseId } from "../types.js";
import {
  clearModeState,
  listActiveModes,
  readModeState,
  type TaiyiModeId,
  MODE_FILE,
} from "./mode-state.js";

export type OrphanRuntimeMode = {
  mode: TaiyiModeId;
  slug: string;
  active: boolean;
};

/** workflow 协议模式：可打印 Skill，但不参与 step driver */
export const WORKFLOW_PROTOCOL_MODES = new Set<TaiyiModeId>([
  "deep-interview",
  "visual-verdict",
  "ai-slop-cleaner",
]);

/** step 真正驱动的运行时模式（优先级顺序） */
export const STEP_DRIVER_MODE_ORDER: TaiyiModeId[] = [
  "ralph",
  "ultraqa",
  "autopilot",
  "ultrawork",
  "team",
  "ralplan",
  "plan",
];

export const STEP_DRIVER_MODES = new Set<TaiyiModeId>(STEP_DRIVER_MODE_ORDER);

function slugChangeMissing(taiyiRoot: string, slug: string): boolean {
  return resolveChangeDir(taiyiRoot, slug) == null;
}

/** 活跃或保留的 runtime 模式指向已不存在的变更目录 */
export function listOrphanRuntimeModes(taiyiRoot: string): OrphanRuntimeMode[] {
  const out: OrphanRuntimeMode[] = [];
  const seen = new Set<string>();

  for (const mode of Object.keys(MODE_FILE) as TaiyiModeId[]) {
    const state = readModeState(taiyiRoot, mode);
    const slug = state?.slug?.trim();
    if (!slug || !slugChangeMissing(taiyiRoot, slug)) continue;
    const key = `${mode}:${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ mode, slug, active: Boolean(state?.active) });
  }

  return out;
}

/** 清除指向不存在变更 slug 的全部 runtime 模式文件 */
export function pruneOrphanRuntimeModes(
  taiyiRoot: string,
  options?: { dryRun?: boolean; slug?: string },
): OrphanRuntimeMode[] {
  const targets = listOrphanRuntimeModes(taiyiRoot).filter(
    (o) => !options?.slug || o.slug === options.slug,
  );
  if (options?.dryRun) return targets;

  for (const { mode } of targets) {
    clearModeState(taiyiRoot, mode);
  }
  return targets;
}

/** 删除变更目录时：停掉该 slug 上的全部 runtime 模式 */
export function clearRuntimeForSlug(
  taiyiRoot: string,
  slug: string,
  options?: { dryRun?: boolean },
): TaiyiModeId[] {
  const cleared: TaiyiModeId[] = [];
  for (const mode of Object.keys(MODE_FILE) as TaiyiModeId[]) {
    const state = readModeState(taiyiRoot, mode);
    if (state?.slug !== slug) continue;
    if (options?.dryRun) {
      cleared.push(mode);
      continue;
    }
    clearModeState(taiyiRoot, mode);
    cleared.push(mode);
  }
  return cleared;
}

export function formatOrphanRuntimePlain(
  orphans: OrphanRuntimeMode[],
  dryRun: boolean,
): string {
  if (orphans.length === 0) return "";
  const verb = dryRun ? "将清除" : "已清除";
  const lines = orphans.map((o) => `  · ${o.mode}${o.active ? " (active)" : ""} → ${o.slug}`);
  return [`${verb} ${orphans.length} 个孤儿 runtime 模式:`, ...lines].join("\n");
}

export function formatStaleRuntimePlain(
  stale: OrphanRuntimeMode[],
  dryRun: boolean,
): string {
  if (stale.length === 0) return "";
  const verb = dryRun ? "将清除" : "已清除";
  const lines = stale.map((o) => `  · ${o.mode} → ${o.slug}${o.active ? "" : " (inactive)"}`);
  return [`${verb} ${stale.length} 个 stale runtime 模式:`, ...lines].join("\n");
}

/** step / modes 横幅：跳过指向不存在变更的活跃模式 */
export function listResolvableActiveModes(
  taiyiRoot: string,
): ReturnType<typeof listActiveModes> {
  return listActiveModes(taiyiRoot).filter((m) => {
    if (!m.slug) return true;
    return !slugChangeMissing(taiyiRoot, m.slug);
  });
}

export function listStepDriverModes(
  taiyiRoot: string,
): ReturnType<typeof listActiveModes> {
  return listResolvableActiveModes(taiyiRoot).filter((m) => STEP_DRIVER_MODES.has(m.mode));
}

export function listWorkflowProtocolModes(
  taiyiRoot: string,
): ReturnType<typeof listActiveModes> {
  return listResolvableActiveModes(taiyiRoot).filter((m) => WORKFLOW_PROTOCOL_MODES.has(m.mode));
}

/** 清除错误阶段仍 active 的 workflow 协议模式 */
export function clearMisphasedWorkflowModes(
  taiyiRoot: string,
  slug: string,
  phase: PhaseId,
): TaiyiModeId[] {
  const guards: Partial<Record<TaiyiModeId, PhaseId[]>> = {
    "deep-interview": ["change", "requirement"],
    "visual-verdict": ["ui-design", "dev", "test", "review"],
    "ai-slop-cleaner": ["dev", "review"],
  };
  const cleared: TaiyiModeId[] = [];
  for (const mode of WORKFLOW_PROTOCOL_MODES) {
    const st = readModeState(taiyiRoot, mode);
    if (!st?.active || st.slug !== slug) continue;
    const allowed = guards[mode];
    if (allowed && !allowed.includes(phase)) {
      clearModeState(taiyiRoot, mode);
      cleared.push(mode);
    }
  }
  return cleared;
}

/** 清除 inactive 或已完成/归档 slug 上的 stale *-mode.json */
export function pruneStaleRuntimeModes(
  taiyiRoot: string,
  options?: { dryRun?: boolean },
): OrphanRuntimeMode[] {
  const out: OrphanRuntimeMode[] = [];
  for (const mode of Object.keys(MODE_FILE) as TaiyiModeId[]) {
    const state = readModeState(taiyiRoot, mode);
    if (!state) continue;
    const slug = state.slug?.trim();
    if (!slug) continue;
    const changeDir = resolveChangeDir(taiyiRoot, slug);
    const st = changeDir ? loadChangeState(taiyiRoot, slug) : null;
    const archived = changeDir?.includes(`${path.sep}archive${path.sep}`) ?? false;
    const stale =
      !state.active ||
      !changeDir ||
      (st != null && isWorkflowCompleted(st)) ||
      archived;
    if (!stale) continue;
    out.push({ mode, slug, active: Boolean(state.active) });
    if (!options?.dryRun) clearModeState(taiyiRoot, mode);
  }
  return out;
}

/** 探测清理后遗留的 prompt-inject 等（可选） */
export function clearRuntimePromptInject(taiyiRoot: string): boolean {
  const p = `${taiyiRoot}/runtime/prompt-inject.txt`;
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}
