import fs from "node:fs";
import path from "node:path";

/** TaiyiForge 原生运行时模式（自 OMC 迁移，存于 .taiyi/runtime/） */
export type TaiyiModeId =
  | "ralph"
  | "autopilot"
  | "ultrawork"
  | "team"
  | "ralplan"
  | "ultraqa"
  | "plan"
  | "deep-interview"
  | "visual-verdict"
  | "ai-slop-cleaner"
  | "ecomode";

export type ModeStateBase = {
  active: boolean;
  slug?: string;
  startedAt: string;
  updatedAt: string;
  linkedModes?: TaiyiModeId[];
  sessionId?: string;
  /** autopilot 等可 resume 的模式保留进度 */
  preserveOnDeactivate?: boolean;
  meta?: Record<string, unknown>;
};

export const MODE_FILE: Record<TaiyiModeId, string> = {
  ralph: "ralph-mode.json",
  autopilot: "autopilot-mode.json",
  ultrawork: "ultrawork-mode.json",
  team: "team-mode.json",
  ralplan: "ralplan-mode.json",
  ultraqa: "ultraqa-mode.json",
  plan: "plan-mode.json",
  "deep-interview": "deep-interview-mode.json",
  "visual-verdict": "visual-verdict-mode.json",
  "ai-slop-cleaner": "ai-slop-cleaner-mode.json",
  ecomode: "ecomode-mode.json",
};

/** 取消依赖顺序（对标 OMC cancel skill） */
export const MODE_CANCEL_ORDER: TaiyiModeId[] = [
  "autopilot",
  "ralph",
  "ultrawork",
  "ultraqa",
  "team",
  "ralplan",
  "plan",
  "deep-interview",
  "visual-verdict",
  "ai-slop-cleaner",
  "ecomode",
];

export function runtimeDir(taiyiRoot: string): string {
  return path.join(taiyiRoot, "runtime");
}

function modePath(taiyiRoot: string, mode: TaiyiModeId): string {
  return path.join(runtimeDir(taiyiRoot), MODE_FILE[mode]);
}

function ensureRuntimeDir(taiyiRoot: string): void {
  const dir = runtimeDir(taiyiRoot);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readModeState<T extends ModeStateBase>(
  taiyiRoot: string,
  mode: TaiyiModeId,
): T | null {
  const p = modePath(taiyiRoot, mode);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

export function writeModeState<T extends ModeStateBase>(
  taiyiRoot: string,
  mode: TaiyiModeId,
  state: T,
): void {
  ensureRuntimeDir(taiyiRoot);
  const next = { ...state, updatedAt: new Date().toISOString() };
  fs.writeFileSync(modePath(taiyiRoot, mode), `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function clearModeState(taiyiRoot: string, mode: TaiyiModeId): void {
  const p = modePath(taiyiRoot, mode);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

export function activateMode(
  taiyiRoot: string,
  mode: TaiyiModeId,
  slug: string,
  extra?: Partial<ModeStateBase>,
): ModeStateBase {
  const now = new Date().toISOString();
  const prev = readModeState(taiyiRoot, mode);
  const state: ModeStateBase = {
    active: true,
    slug,
    startedAt: prev?.startedAt ?? now,
    updatedAt: now,
    ...extra,
  };
  writeModeState(taiyiRoot, mode, state);
  return state;
}

export function deactivateMode(
  taiyiRoot: string,
  mode: TaiyiModeId,
  options?: { preserve?: boolean; meta?: Record<string, unknown> },
): void {
  if (options?.preserve) {
    const prev = readModeState(taiyiRoot, mode);
    if (prev) {
      writeModeState(taiyiRoot, mode, {
        ...prev,
        active: false,
        meta: { ...prev.meta, ...options.meta },
      });
      return;
    }
  }
  clearModeState(taiyiRoot, mode);
}

export function listActiveModes(
  taiyiRoot: string,
): { mode: TaiyiModeId; slug?: string; state: ModeStateBase }[] {
  const out: { mode: TaiyiModeId; slug?: string; state: ModeStateBase }[] = [];
  for (const mode of Object.keys(MODE_FILE) as TaiyiModeId[]) {
    const state = readModeState(taiyiRoot, mode);
    if (state?.active) out.push({ mode, slug: state.slug, state });
  }
  return out;
}

export function anyModeActive(taiyiRoot: string): boolean {
  return listActiveModes(taiyiRoot).length > 0;
}

/** 变更已完成时关闭该 slug 上的全部活跃模式（避免 stop-hook 误报未完成） */
export function deactivateModesForSlug(taiyiRoot: string, slug: string): void {
  for (const mode of Object.keys(MODE_FILE) as TaiyiModeId[]) {
    const st = readModeState(taiyiRoot, mode);
    if (st?.slug !== slug) continue;
    if (mode === "autopilot" && st.preserveOnDeactivate) {
      deactivateMode(taiyiRoot, mode, { preserve: true, meta: { workflowCompleted: true } });
    } else {
      clearModeState(taiyiRoot, mode);
    }
  }
}
