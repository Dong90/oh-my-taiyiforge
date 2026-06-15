import fs from "node:fs";
import path from "node:path";
import type { ChangeState, PhaseId } from "./types.js";
import { getPhase, getNextPhase } from "./phase-registry.js";
import {
  artifactPathForPhase,
  validateArtifactFile,
} from "./artifact-validator.js";
import type { HarnessContext } from "../integrations/harness-hooks.js";
import { getHarnessContext } from "../integrations/harness-hooks.js";
import {
  auxiliaryForPhase,
  pendingAuxiliary,
} from "./routing/auxiliary-hints.js";
import { inferComplexitySignals } from "./routing/infer-complexity.js";
import type { ComplexitySignals } from "./routing/complexity.js";
import { requiresHumanGate } from "./gates/human-gate-config.js";
import { resolveChangeDir } from "./taiyi-archive.js";
import { expectedPhaseCount, isChangeAborted, isWorkflowCompleted, workflowPhaseLabelFromState } from "./change-status.js";
import { buildTokenBudgetSummary } from "./token-runner.js";
import { normalizeState } from "./normalize-state.js";
import { formatSkillFlowPlain } from "../integrations/skill-flow.js";
import { isSeedTemplate } from "./seed-marker.js";
import {
  formatStepBlockers,
  formatSyncActions,
  syncChangeState,
} from "./state-sync.js";
import { detectEarlyCodeChanges } from "./dev-phase-guard.js";

export type PhaseGuide = {
  slug: string;
  profile: ChangeState["profile"];
  skippedPhases: PhaseId[];
  currentPhase: ChangeState["currentPhase"];
  workflowCompleted: boolean;
  workflowAborted?: boolean;
  completedCount: number;
  totalPhases: number;
  skill: string;
  artifact: string;
  artifactPath: string;
  artifactExists: boolean;
  artifactIsSeed: boolean;
  qualityReady: boolean;
  qualityHints: string[];
  nextAction: string;
  nextPhase: string | null;
  nextSkill: string | null;
  requiresHumanGate: boolean;
  complexity?: ChangeState["complexity"];
  /** 从 CHANGE/REQUIREMENT 推断的意图信号（架构图「意图分析」） */
  intentSignals?: ComplexitySignals;
  recommendedAuxiliary: string[];
  pendingAuxiliary: string[];
  auxiliaryCompleted: string[];
  autoHarness: boolean;
  harness?: HarnessContext;
  /** Token 预算摘要行（status/guide） */
  tokenBudgetLine?: string;
  tokenWarnings?: string[];
  /** Superpowers + 可选外部 Skill（workflow-manifest.yaml） */
  skillFlowLine?: string;
  /** 本次 status 自动对齐 state 与磁盘工件 */
  syncActions?: string[];
  /** 须先解决的顺序冲突（超前工件等） */
  stepBlockers?: string[];
  /** dev 前检测到业务代码未提交改动 */
  earlyCodeWarning?: string;
  /** review 前 medium/high 须 taiyi-health */
  healthGateLine?: string;
};

export function buildPhaseGuide(
  taiyiRoot: string,
  slug: string,
  rawState: ChangeState,
  workspaceDir?: string,
): PhaseGuide {
  const changeDir = resolveChangeDir(taiyiRoot, slug) ?? path.join(taiyiRoot, "changes", slug);
  const sync = syncChangeState(changeDir, normalizeState(rawState));
  if (sync.changed) {
    fs.writeFileSync(
      path.join(changeDir, "state.json"),
      JSON.stringify(sync.state, null, 2),
      "utf8",
    );
  }
  const state = sync.state;
  const phase = getPhase(state.currentPhase);
  const artifactPath = artifactPathForPhase(changeDir, state.currentPhase);
  const artifactExists =
    fs.existsSync(artifactPath) && fs.statSync(artifactPath).size > 0;
  let artifactIsSeed = false;
  if (artifactExists && phase.kind === "markdown") {
    try {
      artifactIsSeed = isSeedTemplate(fs.readFileSync(artifactPath, "utf8"));
    } catch {
      artifactIsSeed = false;
    }
  }

  let qualityReady = false;
  let qualityHints: string[] = [];

  if (artifactExists && phase.kind === "markdown") {
    const v = validateArtifactFile(artifactPath, state.currentPhase);
    if (v) {
      qualityHints = v.hints;
      qualityReady = Object.values(v.scores).every(Boolean);
    }
  } else if (artifactExists && phase.kind === "code") {
    const v = validateArtifactFile(artifactPath, state.currentPhase);
    if (v) {
      qualityHints = v.hints;
      qualityReady = Object.values(v.scores).every(Boolean);
    }
  } else {
    qualityHints = [`创建并填写工件: ${artifactPath}`];
  }

  const next = getNextPhase(state.currentPhase, state.skippedPhases);
  const nextPhaseDef = next ? getPhase(next) : null;
  const totalPhases = expectedPhaseCount(state);
  const allDone = isWorkflowCompleted(state);

  const recommendedAuxiliary = auxiliaryForPhase(
    state.currentPhase,
    state.complexity,
  );
  const pending = pendingAuxiliary(recommendedAuxiliary, state.auxiliaryCompleted);
  const humanGate = requiresHumanGate(state.currentPhase);
  const intentSignals = inferComplexitySignals(changeDir);

  let nextAction: string;
  const harness =
    workspaceDir != null
      ? getHarnessContext(workspaceDir, slug, state.currentPhase)
      : undefined;

  const guideBase = {
    workflowCompleted: allDone,
    workflowAborted: isChangeAborted(state),
    completedCount: state.completedPhases.length,
    totalPhases,
  };

  const attachMeta = (guide: PhaseGuide): PhaseGuide => {
    const token = buildTokenBudgetSummary(changeDir, slug, state.currentPhase);
    const skillFlowLine = formatSkillFlowPlain(state.currentPhase) ?? undefined;
    const syncActions = formatSyncActions(sync.actions);
    const stepBlockers = formatStepBlockers(sync.blockers);
    const earlyCode = workspaceDir
      ? detectEarlyCodeChanges(workspaceDir, state.currentPhase)
      : null;
    let nextAction = guide.nextAction;
    if (stepBlockers.length > 0) {
      nextAction = `先解决顺序冲突（删除超前工件或勿跳步），再 /taiyi:continue`;
    } else if (earlyCode) {
      nextAction = `dev 前勿改业务代码；撤销或暂存改动后再推进。`;
    }
    return {
      ...guide,
      nextAction,
      tokenBudgetLine: token.line,
      tokenWarnings: token.evalResult.warnings,
      skillFlowLine,
      syncActions: syncActions.length ? syncActions : undefined,
      stepBlockers: stepBlockers.length ? stepBlockers : undefined,
      earlyCodeWarning: earlyCode?.message,
    };
  };

  if (isChangeAborted(state)) {
    return attachMeta({
      ...guideBase,
      slug,
      profile: state.profile,
      skippedPhases: state.skippedPhases,
      currentPhase: state.currentPhase,
      skill: phase.skill,
      artifact: phase.artifact,
      artifactPath,
      artifactExists,
      artifactIsSeed: false,
      qualityReady: false,
      qualityHints: [],
      nextAction: "变更已取消 → /taiyi:new 创建新变更",
      nextPhase: null,
      nextSkill: null,
      requiresHumanGate: false,
      complexity: state.complexity,
      intentSignals,
      recommendedAuxiliary: [],
      pendingAuxiliary: [],
      auxiliaryCompleted: state.auxiliaryCompleted,
      autoHarness: state.autoHarness ?? false,
      harness,
    });
  }

  if (allDone) {
    return attachMeta({
      ...guideBase,
      slug,
      profile: state.profile,
      skippedPhases: state.skippedPhases,
      currentPhase: state.currentPhase,
      skill: phase.skill,
      artifact: phase.artifact,
      artifactPath,
      artifactExists,
      artifactIsSeed: false,
      qualityReady: true,
      qualityHints: [],
      nextAction:
        `${workflowPhaseLabelFromState(state)}已完成 → /taiyi:archive（可选 sync-openspec）`,
      nextPhase: null,
      nextSkill: null,
      requiresHumanGate: false,
      complexity: state.complexity,
      intentSignals,
      recommendedAuxiliary: [],
      pendingAuxiliary: [],
      auxiliaryCompleted: state.auxiliaryCompleted,
      autoHarness: state.autoHarness ?? false,
      harness,
    });
  }

  const auxNote = pending.length > 0 ? `（可选辅助：${pending.join(", ")}）` : "";

  if (!artifactExists) {
    const pre =
      pending.length > 0 && state.currentPhase === "change"
        ? `建议先运行辅助 Skill：${pending.join(", ")}，再`
        : "";
    nextAction = `${pre}加载 Skill「${phase.skill}」，编辑 ${phase.artifact}`;
  } else if (!qualityReady) {
    nextAction = `完善 ${phase.artifact}（见 qualityHints），再 /taiyi:continue`;
  } else if (humanGate) {
    nextAction = `人工确认后 /taiyi:continue${auxNote}`;
  } else {
    nextAction = `工件就绪，执行 /taiyi:continue${auxNote}`;
  }

  const needsHealth =
    state.currentPhase === "review" &&
    (state.complexity?.level === "high" || state.complexity?.level === "medium") &&
    !state.auxiliaryCompleted.includes("taiyi-health");
  const healthGateLine = needsHealth
    ? `⚠ ${state.complexity?.level} 复杂度 review 门禁：须先 /taiyi:health → health-report.md → mark-aux taiyi-health`
    : undefined;
  if (needsHealth) {
    nextAction = `${state.complexity?.level} 复杂度：先 taiyi-health → mark-aux，再 /taiyi:review-loop`;
  } else if (state.currentPhase === "review") {
    nextAction = `/taiyi:review-loop（会话内循环 review 直到机器审查通过）→ 通过后 complete review --approver`;
  } else if (state.autoHarness) {
    nextAction = `全自动：harness 清单 → 铁三角打卡 → /taiyi:continue`;
  } else if (state.currentPhase === "dev" || state.currentPhase === "test") {
    nextAction = `加载 ${phase.skill}，实现后 /taiyi:apply 或 /taiyi:continue`;
  }

  return attachMeta({
    ...guideBase,
    slug,
    profile: state.profile,
    skippedPhases: state.skippedPhases,
    currentPhase: state.currentPhase,
    skill: phase.skill,
    artifact: phase.artifact,
    artifactPath,
    artifactExists,
    artifactIsSeed,
    qualityReady,
    qualityHints,
    nextAction,
    nextPhase: next,
    nextSkill: nextPhaseDef?.skill ?? null,
    requiresHumanGate: humanGate,
    complexity: state.complexity,
    intentSignals,
    recommendedAuxiliary,
    pendingAuxiliary: pending,
    auxiliaryCompleted: state.auxiliaryCompleted,
    autoHarness: state.autoHarness ?? false,
    harness,
    healthGateLine,
  });
}
