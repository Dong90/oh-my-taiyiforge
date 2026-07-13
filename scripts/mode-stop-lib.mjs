/** Shared stop-hook logic for Cursor + Claude Code (keep aligned with mode-reinforcement.ts) */

import fs from "node:fs";
import path from "node:path";

export function resolveTaiyiRoot(cwd) {
  const base = process.env.TAIYI_WORKSPACE?.trim() || cwd;
  return path.join(path.resolve(base), ".taiyi");
}

function workflowPhaseLabelFromState(st) {
  const skipped = st.skippedPhases?.length ?? 0;
  const n = 9 - skipped;
  if (n === 5) return "五阶段";
  if (n === 9) return "九阶段";
  return `${n} 阶段`;
}

function workflowIncompleteLabel(taiyiRoot, slug) {
  if (!slug) return "工作流未完成";
  const st = readChangeState(taiyiRoot, slug);
  if (st) return `${workflowPhaseLabelFromState(st)}未完成`;
  return "工作流未完成";
}

function readChangeState(taiyiRoot, slug) {
  for (const base of ["changes", "archive"]) {
    const p = path.join(taiyiRoot, base, slug, "state.json");
    if (!fs.existsSync(p)) continue;
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch {
      return null;
    }
  }
  const archiveRoot = path.join(taiyiRoot, "archive");
  if (fs.existsSync(archiveRoot)) {
    for (const ent of fs.readdirSync(archiveRoot)) {
      if (ent === slug || ent.startsWith(`${slug}-`)) {
        const p = path.join(archiveRoot, ent, "state.json");
        if (fs.existsSync(p)) {
          try {
            return JSON.parse(fs.readFileSync(p, "utf8"));
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

function isSlugCompleted(taiyiRoot, slug) {
  const st = readChangeState(taiyiRoot, slug);
  if (!st) return false;
  const skipped = st.skippedPhases?.length ?? 0;
  const total = 9 - skipped;
  return (
    st.completedPhases?.includes("integration") &&
    (st.completedPhases.length >= total || st.workflowStatus === "completed")
  );
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

  if (slug && isSlugCompleted(taiyiRoot, slug)) {
    return null;
  }

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
    autopilot: `[AUTOPILOT] ${workflowIncompleteLabel(taiyiRoot, slug)}。代跑: ${cmd}`,
    ultraqa: `[ULTRAQA] 继续 QA: ${cmd} · /taiyi:test qa`,
    ultrawork: `[ULTRAWORK] 切片未完成。${cmd}`,
    team: `[TEAM] 泳道未完成。${cmd}`,
  };
  return lines[primary.mode] ?? `[${primary.mode}] 继续 ${cmd}`;
}
