import {
  MODE_CANCEL_ORDER,
  clearModeState,
  deactivateMode,
  listActiveModes,
  readModeState,
  type TaiyiModeId,
} from "./mode-state.js";
import { stopTeamMode } from "./team-state.js";

export type CancelModeResult = {
  ok: boolean;
  cancelled: TaiyiModeId[];
  preserved: TaiyiModeId[];
  messages: string[];
  force: boolean;
  /** 无活跃模式且未 force 清除 */
  idle?: boolean;
};

const PRESERVE_ON_CANCEL: TaiyiModeId[] = ["autopilot"];

const MODE_SUCCESS: Record<TaiyiModeId, string> = {
  autopilot: "Autopilot 已停止（进度已保留，可 /taiyi:autopilot 恢复）",
  ralph: "Ralph 已停止",
  ultrawork: "Ultrawork 已停止",
  ultraqa: "UltraQA 已停止",
  team: "Team 流水线已停止",
  ralplan: "Ralplan 已停止",
  plan: "Plan 已停止",
  "deep-interview": "Deep-interview 已停止",
  "visual-verdict": "Visual-verdict 已停止",
  "ai-slop-cleaner": "AI slop cleaner 已停止",
  ecomode: "Ecomode 已停止",
};

function cancelOneMode(taiyiRoot: string, mode: TaiyiModeId): { preserved: boolean; message: string } {
  if (mode === "team") stopTeamMode(taiyiRoot, false);

  const state = readModeState(taiyiRoot, mode);
  if (!state?.active) {
    return { preserved: false, message: `${mode}: 未激活` };
  }

  if (PRESERVE_ON_CANCEL.includes(mode)) {
    deactivateMode(taiyiRoot, mode, { preserve: true, meta: { cancelledAt: new Date().toISOString() } });
    return { preserved: true, message: MODE_SUCCESS[mode] };
  }

  if (mode === "ralph") {
    const ultrawork = readModeState(taiyiRoot, "ultrawork");
    if (ultrawork?.active && (!state.slug || ultrawork.slug === state.slug)) {
      clearModeState(taiyiRoot, "ultrawork");
    }
  }

  deactivateMode(taiyiRoot, mode);
  return { preserved: false, message: MODE_SUCCESS[mode] };
}

/** 停止运行时模式（非 abort 变更）；mode 指定时只停一种 */
export function cancelRuntimeModes(
  taiyiRoot: string,
  options?: { force?: boolean; slug?: string; mode?: TaiyiModeId },
): CancelModeResult {
  const force = Boolean(options?.force);
  const messages: string[] = [];
  const cancelled: TaiyiModeId[] = [];
  const preserved: TaiyiModeId[] = [];

  if (options?.mode) {
    const state = readModeState(taiyiRoot, options.mode);
    if (options.slug && state?.slug && state.slug !== options.slug) {
      return {
        ok: true,
        cancelled: [],
        preserved: [],
        messages: [`${options.mode} 活跃 slug=${state.slug}，与指定 ${options.slug} 不符`],
        force,
        idle: true,
      };
    }
    const r = cancelOneMode(taiyiRoot, options.mode);
    if (!r.message.includes("未激活")) {
      cancelled.push(options.mode);
      if (r.preserved) preserved.push(options.mode);
    }
    messages.push(r.message);
    return { ok: true, cancelled, preserved, messages, force, idle: cancelled.length === 0 };
  }

  const active = listActiveModes(taiyiRoot);
  const filtered = options?.slug
    ? active.filter((a) => a.slug === options.slug)
    : active;

  if (filtered.length === 0 && !force) {
    return {
      ok: true,
      cancelled: [],
      preserved: [],
      messages: ["未检测到活跃运行时模式。使用 --force 清除全部 runtime 状态。"],
      force,
      idle: true,
    };
  }

  const toCancel = force
    ? MODE_CANCEL_ORDER
    : MODE_CANCEL_ORDER.filter((m) => filtered.some((a) => a.mode === m));

  for (const mode of toCancel) {
    const r = cancelOneMode(taiyiRoot, mode);
    if (r.message.includes("未激活")) continue;
    cancelled.push(mode);
    if (r.preserved) preserved.push(mode);
    messages.push(r.message);
  }

  if (force) {
    for (const mode of MODE_CANCEL_ORDER) {
      if (readModeState(taiyiRoot, mode)?.active && !cancelled.includes(mode)) {
        cancelled.push(mode);
      }
      clearModeState(taiyiRoot, mode);
    }
    messages.push("已 force 清除 .taiyi/runtime/*-mode.json");
  }

  return {
    ok: true,
    cancelled,
    preserved,
    messages,
    force,
    idle: cancelled.length === 0 && !force,
  };
}

export function formatCancelModePlain(result: CancelModeResult): string {
  if (result.messages.length === 0) {
    return "无活跃模式";
  }
  return ["══ Taiyi stop-mode（原生 · 对标 OMC cancel）══", ...result.messages.map((m) => `  · ${m}`)].join(
    "\n",
  );
}
