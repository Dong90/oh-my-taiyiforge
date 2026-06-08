import type { PhaseId } from "../types.js";
import { rolesForPhase } from "../agent-roles.js";

/** 对标 OMC spawn_agent 并发上限 */
export const MAX_PARALLEL_AGENTS = 6;

export type SpawnWorker = {
  id: string;
  role: string;
  label: string;
  task: string;
  slice?: string;
};

export type SpawnPlan = {
  slug: string;
  phase: PhaseId;
  workers: SpawnWorker[];
  maxParallel: number;
};

function parseTaskSlices(taskMd: string): string[] {
  const slices: string[] = [];
  const re = /^###\s+(?:Slice|切片|T\d+)[:\s]+(.+)$/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(taskMd)) !== null) {
    slices.push(m[1].trim());
  }
  if (slices.length === 0) {
    const bullets = taskMd.match(/^-\s+\[[ x]\]\s+(.+)$/gim);
    if (bullets) {
      for (const b of bullets.slice(0, MAX_PARALLEL_AGENTS)) {
        slices.push(b.replace(/^-\s+\[[ x]\]\s+/, "").trim());
      }
    }
  }
  return slices;
}

/** 从 TASK.md 与阶段角色生成并行 subagent 派发计划（Agent 在 IDE 内执行 spawn） */
export function buildSpawnPlan(
  slug: string,
  phase: PhaseId,
  taskMd?: string,
): SpawnPlan {
  const roles = rolesForPhase(phase);
  const slices = taskMd ? parseTaskSlices(taskMd) : [];

  const workers: SpawnWorker[] = [];

  if (slices.length > 0 && (phase === "task" || phase === "dev")) {
    for (let i = 0; i < Math.min(slices.length, MAX_PARALLEL_AGENTS); i++) {
      const slice = slices[i];
      const role = roles[i % roles.length] ?? roles[0];
      workers.push({
        id: `w${i + 1}`,
        role: role.id,
        label: role.label,
        task: slice,
        slice,
      });
    }
  } else {
    for (let i = 0; i < Math.min(roles.length, MAX_PARALLEL_AGENTS); i++) {
      const role = roles[i];
      workers.push({
        id: `w${i + 1}`,
        role: role.id,
        label: role.label,
        task: `${role.when}（阶段 ${phase}）`,
      });
    }
  }

  return { slug, phase, workers, maxParallel: MAX_PARALLEL_AGENTS };
}

export function formatSpawnPlanPlain(plan: SpawnPlan): string {
  const lines = [
    `Spawn 计划 · 最多 ${plan.maxParallel} 路并行（对标 OMC spawn_agent）`,
    `  slug: ${plan.slug} · 阶段: ${plan.phase}`,
    "",
  ];
  for (const w of plan.workers) {
    lines.push(`  [${w.id}] /taiyi:agent ${w.role} — ${w.label}`);
    lines.push(`       任务: ${w.task}`);
    if (w.slice) lines.push(`       切片: ${w.slice}`);
  }
  lines.push("");
  lines.push("主会话协议:");
  lines.push("  1. /taiyi:sp dispatching-parallel-agents — 每 worker 一 Task subagent");
  lines.push("  2. /taiyi:sp subagent-driven-development — 主会话只协调与合并");
  lines.push("  3. 每 worker 完成 → /taiyi:ralph 或 /taiyi:review-check");
  lines.push("  4. 全部绿 → /taiyi:continue");
  return lines.join("\n");
}

/** Cursor Task 派发示例（ultrawork step 可选协议） */
export function formatUltraworkTaskProtocol(plan: SpawnPlan, options?: { autoDispatch?: boolean }): string {
  const auto = options?.autoDispatch ?? process.env.TAIYI_ULW_AUTO_TASK === "1";
  const lines = [
    "══ Cursor Task 派发（对标 OMC spawn_agent）══",
    auto
      ? "**AUTO 契约（TAIYI_ULW_AUTO_TASK=1）**：本回合必须并行派发下列 Task，禁止主会话亲自实现全部切片。"
      : "可选：设 TAIYI_ULW_AUTO_TASK=1 或 ultrawork step 时启用强制派发。",
    "主会话只协调；每 worker 用 Task 工具并行（最多 6 路）：",
    "",
  ];
  for (const w of plan.workers) {
    const taskPrompt = [
      `Taiyi ultrawork worker ${w.id} · slug=${plan.slug} · phase=${plan.phase}`,
      `Role: /taiyi:agent ${w.role}`,
      `Slice: ${w.task}`,
      "TDD: /taiyi:sp test-driven-development",
      "Done: ralph green + brief summary for merge",
    ].join("\n");
    lines.push(`Task(subagent_type="generalPurpose", description="ulw ${w.id}: ${(w.slice ?? w.task).slice(0, 48)}", prompt="""
${taskPrompt}
""")`);
    lines.push("");
  }
  lines.push("合并后: scripts/taiyi-forge.sh ralph · /taiyi:continue");
  lines.push("Skill: @taiyi-ultrawork · /taiyi:sp dispatching-parallel-agents");
  if (auto) {
    lines.push("验收: 全部 worker 返回后再声明 ultrawork 步进完成");
  }
  return lines.join("\n");
}
