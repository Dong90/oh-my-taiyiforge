import fs from "node:fs";
import path from "node:path";
import type { WorkflowEngine } from "./workflow-engine.js";
import { rolesForPhase } from "./agent-roles.js";
import { activateMode } from "./runtime/mode-state.js";
import { buildSpawnPlan, formatSpawnPlanPlain } from "./runtime/spawn-delegation.js";
import { buildFanOutPlan, generateAllDispatches } from "./fan-out-executor.js";
import type { TaskSpec } from "../schemas/task.js";
import type { PhaseId } from "./types.js";

export type UltraworkRunResult = {
  ok: boolean;
  slug: string;
  phase: PhaseId;
  text: string;
};

function readTaskMd(changeDir: string): string | undefined {
  const p = path.join(changeDir, "TASK.md");
  if (!fs.existsSync(p)) return undefined;
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return undefined;
  }
}

function readTaskJson(changeDir: string): TaskSpec | undefined {
  const p = path.join(changeDir, "task.json");
  if (!fs.existsSync(p)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as TaskSpec;
  } catch {
    return undefined;
  }
}

/** TaiyiForge 原生 ultrawork — dev/task 高吞吐并行切片 + spawn 计划 */
export function runUltraworkGuide(
  engine: WorkflowEngine,
  slug: string,
  taiyiRoot?: string,
): UltraworkRunResult {
  const state = engine.getState(slug);
  if (!state) {
    return { ok: false, slug, phase: "change", text: `Change not found: ${slug}` };
  }

  const phase = state.currentPhase as PhaseId;
  const allowed: PhaseId[] = ["task", "dev"];
  if (!allowed.includes(phase)) {
    return {
      ok: false,
      slug,
      phase,
      text: [
        `Ultrawork 适用于 task/dev 阶段（当前 ${phase}）`,
        "  请先 /taiyi:continue 到 task 或 dev",
      ].join("\n"),
    };
  }

  const root = taiyiRoot ?? engine.taiyiRoot;
  activateMode(root, "ultrawork", slug, { linkedModes: ["ralph"] });

  const changeDir = engine.changeDir(slug);
  const taskMd = readTaskMd(changeDir);
  const taskJson = readTaskJson(changeDir);

  // Prefer structured fan-out when TASK.json exists
  let fanOutBlock = "";
  if (taskJson && taskJson.slices.length > 0) {
    const fanPlan = buildFanOutPlan(slug, phase, taskJson);
    const dispatches = generateAllDispatches(fanPlan);
    fanOutBlock = [
      "",
      "── 四端并行派发指令 ──",
      "",
      "## OpenCode",
      dispatches.opencode,
      "",
      "## Claude Code",
      dispatches.claude,
      "",
      "## Cursor",
      dispatches.cursor,
      "",
      "## Codex",
      dispatches.codex,
    ].join("\n");
  }

  const plan = buildSpawnPlan(slug, phase, taskMd);
  const roles = rolesForPhase(phase).map((r) => r.id).join(" · ");

  const text = [
    "══ Taiyi Ultrawork（原生 · 高吞吐并行 · 自 OMC 迁移）══",
    `  阶段: ${phase} · 角色: ${roles}`,
    `  状态: .taiyi/runtime/ultrawork-mode.json`,
    "",
    formatSpawnPlanPlain(plan),
    fanOutBlock,
    "",
    "协议:",
    "  1. 按 spawn 计划派最多 6 路 Task subagent",
    "  2. 每切片: /taiyi:tdd dev → /taiyi:ralph",
    "  3. 全部绿 → /taiyi:continue",
    "",
    "停止: /taiyi:stop-mode",
  ].join("\n");

  return { ok: true, slug, phase, text };
}
