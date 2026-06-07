import fs from "node:fs";
import path from "node:path";
import type { WorkflowEngine } from "./workflow-engine.js";
import { artifactPathForPhase } from "./artifact-validator.js";
import {
  evaluateReviewLoopStatus,
  formatMachineReviewPlain,
  formatReviewLoopPlain,
  type MachineReviewResult,
  type ReviewLoopStatus,
} from "./review-gate.js";
import { assessReviewFreshness } from "./review-freshness.js";
import { formatAgentReviewLoopProtocol } from "./review-invoke.js";
import {
  bumpReviewLoopRound,
  clearReviewLoopState,
  defaultReviewLoopMaxRounds,
  markReviewLoopStarted,
  readReviewLoopState,
  type ReviewLoopStateFile,
} from "./review-loop-state.js";

export type ReviewLoopRunResult = {
  ok: boolean;
  slug: string;
  /** review-loop 循环状态（非 complete 阶段的机器门禁） */
  loopStatus: ReviewLoopStatus;
  round: number;
  text: string;
  loopState: ReviewLoopStateFile;
};

export function runReviewMachineCheck(
  engine: WorkflowEngine,
  slug: string,
  options?: { bumpRound?: boolean; workspaceDir?: string },
): ReviewLoopRunResult {
  const state = engine.getState(slug);
  if (!state) {
    const empty: MachineReviewResult = {
      passed: false,
      verdict: "missing",
      openHighFindings: [],
      hints: [`Change not found: ${slug}`],
    };
    const emptyLoop: ReviewLoopStatus = {
      canStop: false,
      verdict: "missing",
      openHighFindings: [],
      hints: [`Change not found: ${slug}`],
    };
    return {
      ok: false,
      slug,
      loopStatus: emptyLoop,
      round: 0,
      text: formatReviewLoopPlain(emptyLoop, undefined, slug),
      loopState: { slug, round: 0, updatedAt: new Date().toISOString() },
    };
  }

  const changeDir = engine.changeDir(slug);
  const workflowPhase = state.currentPhase;
  const reviewPath = artifactPathForPhase(changeDir, "review");
  const workspaceDir = options?.workspaceDir ?? changeDir;
  const isLoop = options?.bumpRound !== false;

  if (isLoop) {
    markReviewLoopStarted(changeDir, slug);
  }

  const loopStateBefore = readReviewLoopState(changeDir);
  const freshness = assessReviewFreshness(workspaceDir, reviewPath, loopStateBefore, {
    requireFreshForLoop: isLoop,
  });

  if (isLoop && freshness.needsFresh) {
    const emptyLoop: ReviewLoopStatus = {
      canStop: false,
      verdict: "missing",
      openHighFindings: [],
      hints: freshness.reasons,
    };
    const loopState = bumpReviewLoopRound(changeDir, slug, "needs_fresh_review");
    const phaseNote =
      workflowPhase !== "review"
        ? `工作流阶段: ${workflowPhase}（/taiyi:review-loop 任意阶段可直接启动 review 循环）`
        : "";
    const text = [
      phaseNote,
      phaseNote ? "" : undefined,
      "① 须先执行新一轮 code review（taiyi-review / gstack review）→ 更新 REVIEW.md",
      "② 再运行: scripts/taiyi-forge.sh review-check " + slug,
      "",
      formatAgentReviewLoopProtocol(
        slug,
        loopState.round,
        loopState.maxRounds ?? defaultReviewLoopMaxRounds(),
      ),
    ]
      .filter((x) => x !== undefined)
      .join("\n");
    return {
      ok: false,
      slug,
      loopStatus: emptyLoop,
      round: loopState.round,
      text,
      loopState,
    };
  }

  function buildLoopText(
    status: ReviewLoopStatus,
    loopState: ReviewLoopStateFile,
    extraLines: string[] = [],
  ): string {
    const base = formatReviewLoopPlain(status, loopState.round, slug);
    if (status.canStop) return [base, ...extraLines].filter(Boolean).join("\n");
    return [
      ...extraLines,
      base,
      "",
      formatAgentReviewLoopProtocol(
        slug,
        loopState.round,
        loopState.maxRounds ?? defaultReviewLoopMaxRounds(),
      ),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (!fs.existsSync(reviewPath)) {
    const emptyLoop: ReviewLoopStatus = {
      canStop: false,
      verdict: "missing",
      openHighFindings: [],
      hints: ["REVIEW.md 不存在 — 立即加载 taiyi-review / gstack review 并写入"],
    };
    const loopState = options?.bumpRound !== false
      ? bumpReviewLoopRound(changeDir, slug, emptyLoop.verdict)
      : { slug, round: 0, updatedAt: new Date().toISOString() };
    const phaseNote =
      workflowPhase !== "review"
        ? `工作流阶段: ${workflowPhase}（/taiyi:review-loop 任意阶段可直接启动 review 循环）`
        : "";
    return {
      ok: false,
      slug,
      loopStatus: emptyLoop,
      round: loopState.round,
      text: buildLoopText(emptyLoop, loopState, phaseNote ? [phaseNote, ""] : []),
      loopState,
    };
  }

  const content = fs.readFileSync(reviewPath, "utf8");
  const loopStatus = evaluateReviewLoopStatus(content);
  let loopState: ReviewLoopStateFile;
  if (options?.bumpRound === false) {
    if (loopStatus.canStop) {
      clearReviewLoopState(changeDir);
    }
    loopState = { slug, round: 0, updatedAt: new Date().toISOString() };
  } else if (loopStatus.canStop) {
    clearReviewLoopState(changeDir);
    loopState = {
      slug,
      round: 0,
      lastVerdict: loopStatus.verdict,
      updatedAt: new Date().toISOString(),
    };
  } else {
    loopState = bumpReviewLoopRound(changeDir, slug, loopStatus.verdict, undefined, {
      lastReviewMdMtimeMs: freshness.reviewMtimeMs,
    });
  }

  const phaseNote =
    workflowPhase !== "review" && !loopStatus.canStop
      ? `工作流阶段: ${workflowPhase}（可先审查代码，无 blocking 后再 /taiyi:continue）`
      : workflowPhase !== "review" && loopStatus.canStop
        ? `工作流阶段: ${workflowPhase}（审查完成；推进到 review 后 complete --approver）`
        : "";

  const text = buildLoopText(loopStatus, loopState, phaseNote ? [phaseNote, ""] : []);

  return {
    ok: loopStatus.canStop,
    slug,
    loopStatus,
    round: loopState.round,
    text,
    loopState,
  };
}

/** 格式化 review-loop 完整输出（含会话循环协议） */
export function formatReviewLoopOutput(
  result: ReviewLoopRunResult,
  options?: { alwaysShowProtocol?: boolean },
): string {
  if (result.ok && !options?.alwaysShowProtocol) return result.text;
  if (result.ok) {
    return [
      result.text,
      "",
      "审查完成，无 blocking 项；本会话 review 循环结束。",
      "→ 请用户确认后: npx taiyi complete <slug> review --approver \"审批人\"",
    ].join("\n");
  }
  return result.text;
}
