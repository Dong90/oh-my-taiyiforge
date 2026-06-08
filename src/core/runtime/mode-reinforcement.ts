import fs from "node:fs";
import path from "node:path";
import { listActiveModes, readModeState, type TaiyiModeId } from "./mode-state.js";
import { readRalphState } from "../ralph-state.js";

export type StopReinforcement = {
  block: boolean;
  followup: string;
  mode: TaiyiModeId | "none";
};

const REINFORCE: Partial<Record<TaiyiModeId, (slug?: string) => string>> = {
  ralph: (slug) =>
    [
      "[RALPH MODE — 对标 OMC stop-hook]",
      "验证尚未通过。禁止结束会话。",
      slug ? `运行: scripts/taiyi-forge.sh step ${slug}` : "运行: scripts/taiyi-forge.sh step",
      "修代码/测试 → 再跑 step/ralph 直到 ✓",
    ].join("\n"),
  ultraqa: (slug) =>
    [
      "[ULTRAQA MODE]",
      "QA 目标未满足。继续 /taiyi:gstack qa · /taiyi:e2e · step",
      slug ? `scripts/taiyi-forge.sh step ${slug}` : "",
    ].join("\n"),
  autopilot: (slug) =>
    [
      "[AUTOPILOT MODE]",
      "九阶段未完成。继续 autopilot 步进：",
      slug ? `scripts/taiyi-forge.sh step ${slug}` : "scripts/taiyi-forge.sh step",
      "或加载 @taiyi-orchestrator 写当前阶段工件",
    ].join("\n"),
  ultrawork: () =>
    "[ULTRAWORK MODE] 仍有切片未完成。派 subagent 或 /taiyi:ralph 后 step",
  team: () => "[TEAM MODE] 当前泳道未完成。按 team 协议继续 → step",
};

/** stop hook：活跃模式未完成时注入 followup（对标 OMC persistent-mode） */
export function buildStopReinforcement(
  taiyiRoot: string,
  changeDir?: string,
): StopReinforcement {
  const active = listActiveModes(taiyiRoot);
  if (active.length === 0) {
    return { block: false, followup: "", mode: "none" };
  }

  const primary =
    active.find((a) => a.mode === "ralph") ??
    active.find((a) => a.mode === "autopilot") ??
    active[0];

  const slug = primary.slug;
  const mode = primary.mode;

  if (mode === "ralph" && changeDir) {
    const rs = readRalphState(changeDir);
    if (!rs || rs.round === 0) {
      return { block: false, followup: "", mode: "none" };
    }
  }

  const autopilot = readModeState(taiyiRoot, "autopilot");
  if (mode === "autopilot" && autopilot?.active === false) {
    return { block: false, followup: "", mode: "none" };
  }

  const fn = REINFORCE[mode];
  const followup = fn?.(slug) ?? `[${mode}] 继续 scripts/taiyi-forge.sh step`;

  return { block: true, followup, mode };
}

export function readPromptInject(taiyiRoot: string): string | null {
  const p = path.join(taiyiRoot, "runtime", "prompt-inject.txt");
  if (!fs.existsSync(p)) return null;
  try {
    const text = fs.readFileSync(p, "utf8").trim();
    fs.unlinkSync(p);
    return text || null;
  } catch {
    return null;
  }
}

export function writePromptInject(taiyiRoot: string, text: string): void {
  const dir = path.join(taiyiRoot, "runtime");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "prompt-inject.txt"), text + "\n", "utf8");
}
