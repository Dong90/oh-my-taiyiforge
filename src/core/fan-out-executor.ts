import type { PhaseId } from "./types.js";
import type { TaskSpec } from "../schemas/task.js";
import { MAX_PARALLEL_AGENTS } from "./runtime/spawn-delegation.js";
import { rolesForPhase } from "./agent-roles.js";

export type Platform = "opencode" | "claude" | "cursor" | "codex";

export type DispatchWorker = {
  id: string;
  role: string;
  label: string;
  task: string;
  testCommand?: string;
};

export type FanOutPlan = {
  slug: string;
  phase: PhaseId;
  workers: DispatchWorker[];
  maxParallel: number;
  platforms: Platform[];
  /** Architecture context guide injected into per-worker prompts (dev phase only). */
  archGuide?: string;
};

// ── Build workers ──

const DEV_ROLES = ["executor", "test-engineer", "debugger"] as const;

/** Build workers from TASK.json structured input. Falls back to role-based if no slices. */
export function buildWorkers(task: TaskSpec, phase: PhaseId): DispatchWorker[] {
  if (task.slices.length === 0) {
    const roles = rolesForPhase(phase);
    return roles.slice(0, MAX_PARALLEL_AGENTS).map((r, i) => ({
      id: `w${i + 1}`,
      role: r.id,
      label: r.label,
      task: `${r.when}（阶段 ${phase}）`,
    }));
  }
  return task.slices.slice(0, MAX_PARALLEL_AGENTS).map((s, i) => ({
    id: `w${i + 1}`,
    role: DEV_ROLES[i % DEV_ROLES.length],
    label: s.label ?? s.id,
    task: s.description ?? s.label ?? s.id,
    testCommand: s.test_command,
  }));
}

export function buildFanOutPlan(
  slug: string,
  phase: PhaseId,
  task: TaskSpec,
  platforms: Platform[] = ["opencode", "claude", "cursor", "codex"],
  archGuide?: string,
): FanOutPlan {
  return {
    slug,
    phase,
    workers: buildWorkers(task, phase),
    maxParallel: MAX_PARALLEL_AGENTS,
    platforms,
    archGuide,
  };
}

// ── Per-platform generators ──

/** OpenCode: Task() tool calls — paste into OpenCode chat, Ctrl+Enter batch dispatch */
export function generateOpenCodeDispatch(plan: FanOutPlan): string {
  const lines = [
    `// OpenCode Fan-out · ${plan.workers.length} workers · slug=${plan.slug} · phase=${plan.phase}`,
    `// Paste the ${plan.workers.length} Task() calls below. Ctrl+Enter to dispatch in parallel.`,
    "",
  ];
  for (const w of plan.workers) {
    const safeLabel = w.label.replace(/"/g, '\\"').replace(/`/g, '\\`').slice(0, 40);
    const promptParts = [
      `TaiyiForge worker ${w.id} · slug=${plan.slug} · phase=${plan.phase}`,
      `Role: executor — ${w.label}`,
      `Task: ${w.task}`,
    ];
    if (plan.archGuide) {
      promptParts.push("", "## 架构约定", plan.archGuide, "");
    }
    promptParts.push(
      w.testCommand ? `Verify: ${w.testCommand}` : "",
      "ECC TDD: write failing test, then minimal implementation.",
      "When done: output SUMMARY + test results.",
    );
    const prompt = promptParts.filter(Boolean).join("\n");
    lines.push(
      `Task(subagent_type="general", description="taiyi ${w.id}: ${safeLabel}", prompt="""`
    );
    lines.push(prompt);
    lines.push(`""")`);
    lines.push("");
  }
  lines.push("// All complete → /taiyi:ralph → /taiyi:continue");
  return lines.join("\n");
}

/** Claude Code: spawn agent instructions + claude -p commands */
export function generateClaudeDispatch(plan: FanOutPlan): string {
  const lines = [
    `# Claude Code Fan-out · ${plan.workers.length} workers · slug=${plan.slug} · phase=${plan.phase}`,
    "",
  ];
  for (const w of plan.workers) {
    const promptParts = [
      `You are worker ${w.id} for change "${plan.slug}" in phase "${plan.phase}".`,
      `Task: ${w.task}`,
    ];
    if (plan.archGuide) {
      promptParts.push("Architecture conventions:", plan.archGuide);
    }
    promptParts.push(
      w.testCommand ? `Verify: ${w.testCommand}` : "",
      "ECC TDD: output SUMMARY + test results when done.",
    );
    const prompt = promptParts.filter(Boolean).join(" ");
    lines.push(`## Worker ${w.id}: ${w.label}`);
    lines.push("```bash");
    lines.push(`claude -p '${prompt}'`);
    lines.push("```");
    lines.push("");
  }
  lines.push("## Merge");
  lines.push("After all workers complete:");
  lines.push("```bash");
  lines.push(`scripts/taiyi-forge.sh ralph ${plan.slug}`);
  lines.push(`scripts/taiyi-forge.sh continue ${plan.slug}`);
  lines.push("```");
  return lines.join("\n");
}

/** Cursor: Task protocol — Ctrl+Enter in Cursor Agent chat */
export function generateCursorDispatch(plan: FanOutPlan): string {
  const lines = [
    `══ Cursor Task Dispatch · ${plan.workers.length} workers · slug=${plan.slug} · phase=${plan.phase} ══`,
    "",
  ];
  for (const w of plan.workers) {
    const safeLabel = w.label.replace(/"/g, '\\"').replace(/`/g, '\\`').slice(0, 40);
    const promptParts = [
      `TaiyiForge worker ${w.id} · slug=${plan.slug} · phase=${plan.phase}`,
      `Role: /taiyi:agent executor`,
      `Task: ${w.task}`,
    ];
    if (plan.archGuide) {
      promptParts.push("## 架构约定", plan.archGuide);
    }
    promptParts.push(
      w.testCommand ? `Test: ${w.testCommand}` : "Test: npm test",
      "TDD: /taiyi:skill ecc tdd-workflow",
      "Done: summary + test results",
    );
    const prompt = promptParts.join("\n");
    lines.push(
      `Task(subagent_type="generalPurpose", description="taiyi ${w.id}: ${safeLabel}", prompt="""`
    );
    lines.push(prompt);
    lines.push(`""")`);
    lines.push("");
  }
  lines.push(`All complete → /taiyi:ralph ${plan.slug} → /taiyi:continue`);
  return lines.join("\n");
}

/** Codex: codex exec commands — paste into Codex terminal */
export function generateCodexDispatch(plan: FanOutPlan): string {
  const lines = [
    `# Codex Fan-out · ${plan.workers.length} workers · slug=${plan.slug} · phase=${plan.phase}`,
    "",
  ];
  for (const w of plan.workers) {
    const promptParts = [
      `You are worker ${w.id} for change "${plan.slug}" in phase "${plan.phase}".`,
      `Task: ${w.task}`,
    ];
    if (plan.archGuide) {
      promptParts.push("Architecture conventions:", plan.archGuide);
    }
    promptParts.push("Use TDD. Output summary when done.");
    const prompt = promptParts.join(" ");
    lines.push(`codex exec --full-auto --prompt "${prompt.replace(/"/g, '\\"')}"`);
    lines.push("");
  }
  lines.push("# Merge:");
  lines.push(`codex exec --full-auto --prompt "Run scripts/taiyi-forge.sh ralph ${plan.slug}"`);
  return lines.join("\n");
}

/** Emit dispatch plan for all requested platforms */
export function generateAllDispatches(plan: FanOutPlan): Record<Platform, string> {
  const dispatchers: Record<Platform, (p: FanOutPlan) => string> = {
    opencode: generateOpenCodeDispatch,
    claude: generateClaudeDispatch,
    cursor: generateCursorDispatch,
    codex: generateCodexDispatch,
  };
  const result = {} as Record<Platform, string>;
  for (const plat of plan.platforms) {
    result[plat] = dispatchers[plat](plan);
  }
  return result;
}
