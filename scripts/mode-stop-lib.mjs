/** Shared stop-hook logic for Cursor + Claude Code (keep aligned with mode-reinforcement.ts) */

import fs from "node:fs";
import path from "node:path";

export function resolveTaiyiRoot(cwd) {
  const base = process.env.TAIYI_WORKSPACE?.trim() || cwd;
  return path.join(path.resolve(base), ".taiyi");
}

export function listActiveModes(taiyiRoot) {
  const dir = path.join(taiyiRoot, "runtime");
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith("-mode.json")) continue;
    try {
      const st = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      if (st.active) {
        out.push({ mode: f.replace("-mode.json", ""), slug: st.slug });
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function readRalphRound(changeDir) {
  const p = path.join(changeDir, ".ralph-state.json");
  if (!fs.existsSync(p)) return 0;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")).round ?? 0;
  } catch {
    return 0;
  }
}

/** @returns {string|null} followup text or null when stop should pass through */
export function buildModeStopFollowup(active, taiyiRoot) {
  if (!active.length) return null;

  const primary =
    active.find((a) => a.mode === "ralph") ??
    active.find((a) => a.mode === "autopilot") ??
    active[0];
  const slug = primary.slug;
  const cmd = slug ? `scripts/taiyi-forge.sh step ${slug}` : "scripts/taiyi-forge.sh step";

  if (primary.mode === "ralph" && slug) {
    const round = readRalphRound(path.join(taiyiRoot, "changes", slug));
    if (round === 0) return null;
    return [
      "[RALPH MODE — The boulder never stops]",
      `验证尚未通过（轮次 ${round}）。禁止结束。`,
      `Agent 代跑: ${cmd}`,
      "修测试/代码 → 再 step 直到 ✓",
    ].join("\n");
  }

  const lines = {
    autopilot: `[AUTOPILOT] 九阶段未完成。代跑: ${cmd}`,
    ultraqa: `[ULTRAQA] 继续 QA: ${cmd} · /taiyi:gstack qa`,
    ultrawork: `[ULTRAWORK] 切片未完成。${cmd}`,
    team: `[TEAM] 泳道未完成。${cmd}`,
  };
  return lines[primary.mode] ?? `[${primary.mode}] 继续 ${cmd}`;
}
