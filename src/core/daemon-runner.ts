import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { WorkflowEngine } from "./workflow-engine.js";
import { isChangeAborted, isWorkflowCompleted, workflowPhaseLabelFromState } from "./change-status.js";
import { activateMode, deactivateModesForSlug } from "./runtime/mode-state.js";
import { runModeStep, type ModeStepAction } from "./runtime/mode-orchestrator.js";
import { runAutopilotGuide } from "./autopilot-runner.js";
import { runContinueRepeat } from "./loop-runner.js";
import { writeCiAgentPrompt } from "./ci-platform.js";
import { invokeDaemonAgent, resolveDaemonPlatform } from "./daemon-agent.js";
import { allowAutoHumanEnv, requiresHumanGate } from "./gates/human-gate-config.js";
import type { PhaseId } from "./types.js";

export type DaemonStopReason =
  | "completed"
  | "blocked"
  | "max-rounds"
  | "aborted"
  | "agent-failed"
  | "not-found";

export type DaemonRoundRecord = {
  round: number;
  phase: PhaseId;
  stepAction?: ModeStepAction;
  engineAdvanced: boolean;
  agentInvoked: boolean;
  agentOk?: boolean;
  summary: string;
};

export type DaemonRunResult = {
  ok: boolean;
  slug: string;
  stopReason: DaemonStopReason;
  rounds: DaemonRoundRecord[];
  roundCount: number;
  maxRounds: number;
  promptFile?: string;
  agentCommand?: string;
  message: string;
};

export type DaemonRunOptions = {
  engineOnly?: boolean;
  dryRun?: boolean;
  force?: boolean;
  maxRounds?: number;
  env?: NodeJS.ProcessEnv;
};

export type DaemonState = {
  slug: string;
  startedAt: string;
  updatedAt: string;
  round: number;
  maxRounds: number;
  lastPhase: PhaseId;
  lastStopReason?: DaemonStopReason;
  active: boolean;
};

function daemonStatePath(taiyiRoot: string, slug: string): string {
  return path.join(taiyiRoot, "runtime", `daemon-${slug}.json`);
}

function defaultMaxRounds(env = process.env): number {
  const n = Number(env.TAIYI_DAEMON_MAX_ROUNDS ?? "30");
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function daemonIntervalMs(env = process.env): number {
  const n = Number(env.TAIYI_DAEMON_INTERVAL_MS ?? "0");
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function daemonSleep(ms: number): void {
  if (ms <= 0) return;
  spawnSync("sleep", [String(Math.max(1, Math.ceil(ms / 1000)))], { stdio: "ignore" });
}

export function readDaemonState(taiyiRoot: string, slug: string): DaemonState | null {
  const p = daemonStatePath(taiyiRoot, slug);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as DaemonState;
  } catch {
    return null;
  }
}

export function writeDaemonState(taiyiRoot: string, state: DaemonState): void {
  const dir = path.join(taiyiRoot, "runtime");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(daemonStatePath(taiyiRoot, state.slug), JSON.stringify(state, null, 2), "utf8");
}

function markDaemonInactive(taiyiRoot: string, slug: string, stopReason: DaemonStopReason): void {
  const prev = readDaemonState(taiyiRoot, slug);
  if (!prev) return;
  writeDaemonState(taiyiRoot, {
    ...prev,
    updatedAt: new Date().toISOString(),
    lastStopReason: stopReason,
    active: false,
  });
}

function needsAgentStep(action: ModeStepAction, stepOk: boolean): boolean {
  if (stepOk) return false;
  return ["blocked", "harness", "ralph-fix", "review-fix", "human-gate"].includes(action);
}

function tryAutoHumanComplete(
  engine: WorkflowEngine,
  slug: string,
  phase: PhaseId,
  env = process.env,
): { ok: boolean; message: string } {
  if (!requiresHumanGate(phase, env) || !allowAutoHumanEnv(env)) {
    return { ok: false, message: "human gate not auto-skippable" };
  }
  const result = engine.completePhase(slug, phase, {
    quality: {
      completeness: true,
      consistency: true,
      verifiability: true,
      traceability: true,
      engineering_quality: true,
    },
    human: { approved: true, approver: "cli-operator" },
  });
  if (result.ok) {
    return { ok: true, message: `✓ ${phase} 自动人工门过关 (TAIYI_AUTO_HUMAN)` };
  }
  return { ok: false, message: result.error ?? "complete 失败" };
}

/** 无人 Agent 闭环：引擎 step/loop + 可选外部 LLM CLI（codex/claude/cursor/opencode） */
export function runDaemonLoop(
  engine: WorkflowEngine,
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
  options: DaemonRunOptions = {},
): DaemonRunResult {
  const env = options.env ?? process.env;
  const maxRounds = options.maxRounds ?? defaultMaxRounds(env);
  const engineOnly = options.engineOnly || env.TAIYI_DAEMON_ENGINE_ONLY === "1";
  const rounds: DaemonRoundRecord[] = [];

  const state0 = engine.getState(slug);
  if (!state0) {
    return {
      ok: false,
      slug,
      stopReason: "not-found",
      rounds,
      roundCount: 0,
      maxRounds,
      message: `Change not found: ${slug}`,
    };
  }

  if (isChangeAborted(state0)) {
    return {
      ok: false,
      slug,
      stopReason: "aborted",
      rounds,
      roundCount: 0,
      maxRounds,
      message: `变更 ${slug} 已取消`,
    };
  }

  if (isWorkflowCompleted(state0)) {
    deactivateModesForSlug(taiyiRoot, slug);
    return {
      ok: true,
      slug,
      stopReason: "completed",
      rounds,
      roundCount: 0,
      maxRounds,
      message: `${workflowPhaseLabelFromState(state0)}已全部完成 → archive`,
    };
  }

  if (!state0.autoHarness && !options.force) {
    return {
      ok: false,
      slug,
      stopReason: "blocked",
      rounds,
      roundCount: 0,
      maxRounds,
      message: [
        "Daemon 需要 autoHarness（init --auto 或 TAIYI_AUTO_HARNESS=1）",
        "  或加 --force 强制启动（仍须 Agent 写工件）",
      ].join("\n"),
    };
  }

  runAutopilotGuide(engine, workspaceDir, taiyiRoot, slug);
  activateMode(taiyiRoot, "autopilot", slug, { preserveOnDeactivate: true });

  const startedAt = new Date().toISOString();
  writeDaemonState(taiyiRoot, {
    slug,
    startedAt,
    updatedAt: startedAt,
    round: 0,
    maxRounds,
    lastPhase: state0.currentPhase as PhaseId,
    active: true,
  });

  let promptFile: string | undefined;
  let agentCommand: string | undefined;

  for (let round = 1; round <= maxRounds; round++) {
    const state = engine.getState(slug);
    if (!state) {
      markDaemonInactive(taiyiRoot, slug, "not-found");
      return {
        ok: false,
        slug,
        stopReason: "not-found",
        rounds,
        roundCount: round - 1,
        maxRounds,
        message: `Change not found: ${slug}`,
      };
    }

    if (isChangeAborted(state)) {
      markDaemonInactive(taiyiRoot, slug, "aborted");
      return {
        ok: false,
        slug,
        stopReason: "aborted",
        rounds,
        roundCount: round,
        maxRounds,
        message: `变更 ${slug} 已取消`,
      };
    }

    if (isWorkflowCompleted(state)) {
      deactivateModesForSlug(taiyiRoot, slug);
      markDaemonInactive(taiyiRoot, slug, "completed");
      return {
        ok: true,
        slug,
        stopReason: "completed",
        rounds,
        roundCount: round,
        maxRounds,
        message: `✓ ${workflowPhaseLabelFromState(state)}已全部完成 → archive`,
      };
    }

    const phase = state.currentPhase as PhaseId;
    writeDaemonState(taiyiRoot, {
      slug,
      startedAt,
      updatedAt: new Date().toISOString(),
      round,
      maxRounds,
      lastPhase: phase,
      active: true,
    });

    let engineAdvanced = false;
    let agentInvoked = false;
    let agentOk: boolean | undefined;
    let summary = "";

    const step = runModeStep(engine, workspaceDir, taiyiRoot, slug, "autopilot");

    if (step.action === "done") {
      deactivateModesForSlug(taiyiRoot, slug);
      rounds.push({
        round,
        phase,
        stepAction: step.action,
        engineAdvanced: true,
        agentInvoked: false,
        summary: step.text.split("\n")[0] ?? "completed",
      });
      markDaemonInactive(taiyiRoot, slug, "completed");
      return {
        ok: true,
        slug,
        stopReason: "completed",
        rounds,
        roundCount: round,
        maxRounds,
        message: step.text,
      };
    }

    if (step.action === "advanced") {
      engineAdvanced = true;
      summary = step.text.split("\n").find((l) => l.includes("✓")) ?? "engine advanced";
      rounds.push({ round, phase, stepAction: step.action, engineAdvanced, agentInvoked, summary });
      if (options.dryRun) {
        markDaemonInactive(taiyiRoot, slug, "blocked");
        return {
          ok: false,
          slug,
          stopReason: "blocked",
          rounds,
          roundCount: round,
          maxRounds,
          message: [
            `dry-run: ${phase} 阶段引擎已过关，提前退出（避免空转 ${maxRounds} 轮）`,
            "",
            step.text.slice(0, 800),
          ].join("\n"),
        };
      }
      daemonSleep(daemonIntervalMs(env));
      continue;
    }

    if (step.action === "human-gate") {
      const human = tryAutoHumanComplete(engine, slug, phase, env);
      if (human.ok) {
        engineAdvanced = true;
        summary = human.message;
        rounds.push({
          round,
          phase,
          stepAction: step.action,
          engineAdvanced,
          agentInvoked: false,
          summary,
        });
        daemonSleep(daemonIntervalMs(env));
        continue;
      }
    }

    if (!requiresHumanGate(phase, env)) {
      const loop = runContinueRepeat(engine, workspaceDir, taiyiRoot, slug, 1);
      const last = loop.attempts.at(-1);
      if (last?.outcome === "advanced") {
        engineAdvanced = true;
        summary = last.message;
        rounds.push({
          round,
          phase,
          stepAction: step.action,
          engineAdvanced,
          agentInvoked: false,
          summary,
        });
        daemonSleep(daemonIntervalMs(env));
        continue;
      }
    }

    if (!needsAgentStep(step.action, step.ok)) {
      if (
        options.dryRun &&
        !engineAdvanced &&
        (step.action === "harness" || step.action === "blocked" || step.action === "human-gate")
      ) {
        markDaemonInactive(taiyiRoot, slug, "blocked");
        return {
          ok: false,
          slug,
          stopReason: "blocked",
          rounds,
          roundCount: round,
          maxRounds,
          message: [
            `dry-run: ${phase} 阶段阻塞且无引擎进展，提前退出（避免空转 ${maxRounds} 轮）`,
            "",
            step.text.slice(0, 800),
          ].join("\n"),
        };
      }
      summary = step.text.split("\n")[0] ?? "waiting";
      rounds.push({ round, phase, stepAction: step.action, engineAdvanced, agentInvoked, summary });
      daemonSleep(daemonIntervalMs(env));
      continue;
    }

    if (engineOnly) {
      markDaemonInactive(taiyiRoot, slug, "blocked");
      return {
        ok: false,
        slug,
        stopReason: "blocked",
        rounds,
        roundCount: round,
        maxRounds,
        message: [
          "引擎步进阻塞，--engine-only 未调用 Agent",
          "",
          step.text,
          "",
          "去掉 --engine-only 并配置 TAIYI_DAEMON_PLATFORM 或 TAIYI_DAEMON_AGENT_CMD",
        ].join("\n"),
      };
    }

    promptFile = writeCiAgentPrompt(workspaceDir, taiyiRoot, state);
    const daemonPrompt = [
      fs.readFileSync(promptFile, "utf8"),
      "",
      "══ Daemon 闭环协议 ══",
      "1. 按 harness 清单完成当前阶段（双线 harness → 辅助 mark-aux → 主 Skill 写工件）",
      "2. dev/test: TDD 实现 + scripts/taiyi-forge.sh ralph 直到绿",
      "3. review: review-loop + health-report",
      "4. 就绪后 scripts/taiyi-forge.sh step 或 continue（人工门须 --approver）",
      "5. 不要结束会话 — daemon 会继续下一轮",
    ].join("\n");
    fs.writeFileSync(promptFile, daemonPrompt, "utf8");

    agentInvoked = true;
    const agent = invokeDaemonAgent({
      promptFile,
      slug,
      phase,
      platform: resolveDaemonPlatform(env),
      customCmd: env.TAIYI_DAEMON_AGENT_CMD,
      dryRun: options.dryRun,
      env,
    });
    agentCommand = agent.command;
    agentOk = agent.skipped ? false : agent.ok;

    if (agent.skipped && agent.skipReason === "no-platform") {
      markDaemonInactive(taiyiRoot, slug, "blocked");
      return {
        ok: false,
        slug,
        stopReason: "blocked",
        rounds,
        roundCount: round,
        maxRounds,
        promptFile,
        message: [
          "需要 Agent 写工件/修代码，但未检测到 CLI",
          "",
          step.text,
          "",
          "配置其一:",
          "  export TAIYI_DAEMON_PLATFORM=cursor|codex|claude|opencode",
          "  export TAIYI_DAEMON_AGENT_CMD='codex exec --full-auto \"$(cat {{PROMPT}})\"'",
        ].join("\n"),
      };
    }

    if (!agent.skipped && !agent.ok) {
      markDaemonInactive(taiyiRoot, slug, "agent-failed");
      return {
        ok: false,
        slug,
        stopReason: "agent-failed",
        rounds,
        roundCount: round,
        maxRounds,
        promptFile,
        agentCommand,
        message: [
          `Agent 退出码 ${agent.exitCode}`,
          agent.command,
          agent.stderr || agent.stdout,
          "",
          step.text,
        ].join("\n"),
      };
    }

    summary = options.dryRun
      ? `[dry-run] agent: ${agent.stdout.split("\n")[0] ?? "ok"}`
      : `agent invoked (${agent.ok ? "ok" : "dry"})`;
    rounds.push({
      round,
      phase,
      stepAction: step.action,
      engineAdvanced,
      agentInvoked,
      agentOk,
      summary,
    });

    if (
      options.dryRun &&
      !engineAdvanced &&
      ["harness", "human-gate", "blocked", "ralph-fix", "review-fix"].includes(step.action)
    ) {
      markDaemonInactive(taiyiRoot, slug, "blocked");
      return {
        ok: false,
        slug,
        stopReason: "blocked",
        rounds,
        roundCount: round,
        maxRounds,
        promptFile,
        agentCommand,
        message: [
          `dry-run: ${phase} 阶段阻塞且无引擎进展，提前退出（避免空转 ${maxRounds} 轮）`,
          "",
          step.text.slice(0, 800),
        ].join("\n"),
      };
    }

    if (options.dryRun && !engineAdvanced) {
      markDaemonInactive(taiyiRoot, slug, "blocked");
      return {
        ok: false,
        slug,
        stopReason: "blocked",
        rounds,
        roundCount: round,
        maxRounds,
        promptFile,
        agentCommand,
        message: [
          `dry-run: 第 ${round} 轮无引擎进展，提前退出（避免空转 ${maxRounds} 轮）`,
          "",
          step.text.slice(0, 800),
        ].join("\n"),
      };
    }

    daemonSleep(daemonIntervalMs(env));
  }

  markDaemonInactive(taiyiRoot, slug, "max-rounds");
  return {
    ok: false,
    slug,
    stopReason: "max-rounds",
    rounds,
    roundCount: maxRounds,
    maxRounds,
    promptFile,
    agentCommand,
    message: `已达 daemon 轮次上限 ${maxRounds}（TAIYI_DAEMON_MAX_ROUNDS）`,
  };
}

export function formatDaemonResultPlain(result: DaemonRunResult): string {
  const lines: string[] = [
    "══ Taiyi Daemon（无人 Agent 闭环）══",
    `slug: ${result.slug} · 轮次 ${result.roundCount}/${result.maxRounds} · ${result.stopReason}`,
  ];

  if (result.rounds.length > 0) {
    lines.push("");
    for (const r of result.rounds) {
      lines.push(`  [${r.round}] ${r.phase} — ${r.summary}`);
    }
  }

  lines.push("");
  lines.push(result.message);

  if (result.promptFile) {
    lines.push("");
    lines.push(`CI prompt: ${result.promptFile}`);
  }
  if (result.agentCommand) {
    lines.push(`Agent cmd: ${result.agentCommand}`);
  }

  if (result.stopReason === "completed") {
    lines.push("");
    lines.push("下一步: scripts/taiyi-forge.sh archive " + result.slug);
  } else if (result.stopReason === "blocked" || result.stopReason === "max-rounds") {
    lines.push("");
    lines.push("恢复: scripts/taiyi-forge.sh daemon run " + result.slug);
    lines.push("停止: scripts/taiyi-forge.sh stop-mode");
  }

  return lines.join("\n");
}
