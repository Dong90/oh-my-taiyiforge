import type { PhaseId } from "./types.js";
import type { WorkflowEngine } from "./workflow-engine.js";
import { requiresHumanGate } from "./gates/human-gate-config.js";
import { isWorkflowCompleted } from "./change-status.js";
import { buildPhaseGuide } from "./phase-guide.js";
import { formatGuidePlain, formatPhaseProgressLine } from "./format-guide.js";
import { taiyiNext } from "../plugin/handlers.js";
import { defaultLoopMax } from "./repeat-parse.js";
import { bumpLoopRound, clearLoopState } from "./loop-state.js";
import { loopSlash } from "./loop-invoke.js";

export type LoopStopReason = "completed" | "blocked" | "max";

export type LoopAttempt = {
  index: number;
  phase: PhaseId;
  outcome: "advanced" | "blocked";
  message: string;
};

export type LoopRunResult = {
  ok: boolean;
  slug: string;
  stopReason: LoopStopReason;
  attempts: LoopAttempt[];
  timesRequested: number;
  loopRound?: number;
  maxRounds?: number;
  guideText?: string;
};

function attemptContinueOnce(
  engine: WorkflowEngine,
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
): { advanced: boolean; phase: PhaseId; message: string } {
  const state = engine.getState(slug);
  if (!state) return { advanced: false, phase: "change", message: `Change not found: ${slug}` };
  if (isWorkflowCompleted(state)) {
    return { advanced: true, phase: state.currentPhase, message: "九阶段已全部完成" };
  }

  const phaseId = state.currentPhase as PhaseId;
  if (requiresHumanGate(phaseId)) {
    const next = taiyiNext(workspaceDir, slug, true);
    const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
    const hint = next.ok && "text" in next && next.text ? next.text : formatGuidePlain(guide);
    return {
      advanced: false,
      phase: phaseId,
      message: `阶段 ${phaseId} 需人工审批，loop 不能自动过关。请填好工件后 /taiyi:continue 并显式 complete。\n${hint}`,
    };
  }

  const result = engine.completePhase(slug, phaseId, {
    quality: {
      completeness: true,
      consistency: true,
      verifiability: true,
      traceability: true,
      engineering_quality: true,
    },
    human: {
      approved: true,
      approver: "loop-auto",
    },
  });

  if (result.ok) {
    const after = engine.getState(slug);
    const done = after && isWorkflowCompleted(after);
    return {
      advanced: true,
      phase: phaseId,
      message: done ? `✓ ${phaseId} 过关 → 全部完成` : `✓ ${phaseId} 过关`,
    };
  }

  const next = taiyiNext(workspaceDir, slug, true);
  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  const hint = next.ok && "text" in next && next.text ? next.text : formatGuidePlain(guide);
  return {
    advanced: false,
    phase: phaseId,
    message: `${result.error}\n${hint}`,
  };
}

export function runContinueRepeat(
  engine: WorkflowEngine,
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
  times: number,
): LoopRunResult {
  const attempts: LoopAttempt[] = [];

  for (let i = 1; i <= times; i++) {
    const state = engine.getState(slug);
    if (!state) {
      return {
        ok: false,
        slug,
        stopReason: "blocked",
        attempts,
        timesRequested: times,
        guideText: `Change not found: ${slug}`,
      };
    }
    if (isWorkflowCompleted(state)) {
      clearLoopState(engine.changeDir(slug));
      return { ok: true, slug, stopReason: "completed", attempts, timesRequested: times };
    }

    const r = attemptContinueOnce(engine, workspaceDir, taiyiRoot, slug);
    attempts.push({
      index: i,
      phase: r.phase,
      outcome: r.advanced ? "advanced" : "blocked",
      message: r.message,
    });

    if (!r.advanced) {
      return {
        ok: false,
        slug,
        stopReason: i >= times ? "max" : "blocked",
        attempts,
        timesRequested: times,
        guideText: r.message,
      };
    }

    const after = engine.getState(slug);
    if (after && isWorkflowCompleted(after)) {
      clearLoopState(engine.changeDir(slug));
      return { ok: true, slug, stopReason: "completed", attempts, timesRequested: times };
    }
  }

  return { ok: false, slug, stopReason: "max", attempts, timesRequested: times };
}

export function runLoopUntilComplete(
  engine: WorkflowEngine,
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
  times?: number,
): LoopRunResult {
  const maxAttempts = times ?? defaultLoopMax();
  const maxRounds = Number(process.env.TAIYI_LOOP_MAX_ROUNDS ?? "50");
  const changeDir = engine.changeDir(slug);
  const result = runContinueRepeat(engine, workspaceDir, taiyiRoot, slug, maxAttempts);

  if (result.stopReason === "completed") {
    clearLoopState(changeDir);
    return result;
  }

  const state = engine.getState(slug);
  const phase = state?.currentPhase ?? "change";
  const loopState = bumpLoopRound(changeDir, slug, maxRounds, phase);

  return {
    ...result,
    loopRound: loopState.round,
    maxRounds: loopState.maxRounds,
    guideText: result.guideText ?? result.attempts.at(-1)?.message,
  };
}

export function formatLoopResultPlain(
  result: LoopRunResult,
  engine: WorkflowEngine,
  taiyiRoot: string,
  workspaceDir: string,
): string {
  const lines: string[] = [];

  if (result.stopReason === "completed") {
    lines.push("✓ 循环结束：九阶段已全部完成 → /taiyi:archive");
    if (result.attempts.length > 0) {
      lines.push(`  本轮连续过关 ${result.attempts.length} 次`);
    }
    return lines.join("\n");
  }

  lines.push(`循环停止（${result.stopReason === "max" ? "达本轮次数上限" : "当前阶段未就绪"}）`);

  for (const a of result.attempts) {
    if (a.outcome === "advanced") {
      lines.push(`  [${a.index}] ${a.message}`);
    }
  }

  const last = result.attempts.at(-1);
  const state = engine.getState(result.slug);
  if (state && last) {
    const guide = buildPhaseGuide(taiyiRoot, result.slug, state, workspaceDir);
    lines.push("");
    lines.push(formatPhaseProgressLine(guide));
  }

  if (result.loopRound != null && result.maxRounds != null) {
    lines.push("");
    lines.push(`会话循环: 第 ${result.loopRound}/${result.maxRounds} 轮（跨轮累计，见 .loop-state.json）`);
    if (result.loopRound >= result.maxRounds) {
      lines.push("  ⚠ 已达会话循环上限，请人工检查或提高 TAIYI_LOOP_MAX_ROUNDS");
    } else {
      lines.push(`  → 完成当前阶段工件/实现后，再次 ${loopSlash(result.slug)}`);
    }
  } else if (result.stopReason === "max") {
    lines.push("");
    lines.push(`  → 本轮已尝试 ${result.timesRequested} 次，可再次 ${loopSlash(result.slug)} 继续`);
  } else {
    lines.push("");
    lines.push(`  → 按指引补全后 ${loopSlash(result.slug)} 或 /taiyi:continue`);
  }

  if (result.guideText && last?.outcome === "blocked") {
    lines.push("");
    lines.push(result.guideText);
  }

  return lines.join("\n");
}

export function formatAgentLoopProtocol(slug: string, round?: number, maxRounds?: number): string {
  const max = maxRounds ?? Number(process.env.TAIYI_LOOP_MAX_ROUNDS ?? "50");
  const r = round ?? 0;
  return [
    "Agent 循环协议（直到功能完成）:",
    `  1. ${loopSlash(slug)} — 引擎能自动过的阶段连续 continue`,
    "  2. 若阻塞 → 加载当前阶段 Skill 写工件或 /taiyi:apply 实现",
    "  3. 铁三角 / harness-check 完成后回到步骤 1",
    `  4. 会话循环上限 ${max} 轮（当前约 ${r}/${max}）`,
    "  5. 九阶段完成 → /taiyi:archive",
    "",
    "次数后缀: /taiyi:continue x3 · /taiyi:apply x2 · /taiyi:check x2（单轮内重复执行）",
  ].join("\n");
}
