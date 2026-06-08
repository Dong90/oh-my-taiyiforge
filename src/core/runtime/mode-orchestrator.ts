import type { WorkflowEngine } from "../workflow-engine.js";
import { buildPhaseGuide } from "../phase-guide.js";
import { buildHarnessPlan, formatHarnessPlanPlain } from "../harness-runner.js";
import { formatGuidePlain, formatPhaseProgressLine } from "../format-guide.js";
import { isWorkflowCompleted } from "../change-status.js";
import { requiresHumanGate } from "../gates/human-gate-config.js";
import { runRalphVerify } from "../ralph-runner.js";
import { runReviewMachineCheck } from "../review-loop-runner.js";
import { activateMode, listActiveModes, type TaiyiModeId } from "./mode-state.js";
import { buildSpawnPlan, formatSpawnPlanPlain, formatUltraworkTaskProtocol } from "./spawn-delegation.js";
import { readTaskMd, ensureTeamMode, formatTeamPipelinePlain } from "./team-state.js";
import type { PhaseId } from "../types.js";

export type ModeStepAction =
  | "done"
  | "ralph-fix"
  | "review-fix"
  | "harness"
  | "human-gate"
  | "advanced"
  | "blocked";

export type ModeStepResult = {
  ok: boolean;
  mode: TaiyiModeId | "none";
  slug: string;
  phase: PhaseId;
  action: ModeStepAction;
  text: string;
  verifyExitCode?: number;
};

const MODE_PRIORITY: TaiyiModeId[] = [
  "autopilot",
  "ralph",
  "ultraqa",
  "ultrawork",
  "team",
  "ralplan",
  "plan",
];

function resolvePrimaryMode(
  taiyiRoot: string,
  explicit?: TaiyiModeId,
): { mode: TaiyiModeId | "none"; slug?: string } {
  if (explicit) {
    const active = listActiveModes(taiyiRoot).find((m) => m.mode === explicit);
    return { mode: explicit, slug: active?.slug };
  }
  const active = listActiveModes(taiyiRoot);
  if (active.length === 0) return { mode: "none" };
  for (const id of MODE_PRIORITY) {
    const hit = active.find((a) => a.mode === id);
    if (hit) return { mode: id, slug: hit.slug };
  }
  return { mode: active[0].mode, slug: active[0].slug };
}

function tryAutoContinue(
  engine: WorkflowEngine,
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
): { advanced: boolean; text: string } {
  const state = engine.getState(slug);
  if (!state || isWorkflowCompleted(state)) {
    return { advanced: true, text: "九阶段已完成" };
  }
  const phase = state.currentPhase as PhaseId;
  if (requiresHumanGate(phase)) {
    return {
      advanced: false,
      text: `阶段 ${phase} 须人工门：scripts/taiyi-forge.sh continue ${slug} --approver "你的名字"`,
    };
  }
  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  if (!guide.qualityReady) {
    return { advanced: false, text: formatGuidePlain(guide) };
  }
  const plan = buildHarnessPlan(workspaceDir, taiyiRoot, state);
  if (plan.blockers.length > 0) {
    return { advanced: false, text: [`auto 阻塞:`, ...plan.blockers].join("\n") };
  }
  const result = engine.completePhase(slug, phase, {
    quality: {
      completeness: true,
      consistency: true,
      verifiability: true,
      traceability: true,
      engineering_quality: true,
    },
    human: { approved: true, approver: "autopilot-step" },
  });
  if (result.ok) {
    return { advanced: true, text: `✓ ${phase} 自动过关` };
  }
  return { advanced: false, text: result.error ?? "complete 失败" };
}

/** 单步驱动活跃模式（对标 OMC 每轮 stop-hook / autopilot 步进） */
export function runModeStep(
  engine: WorkflowEngine,
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
  explicitMode?: TaiyiModeId,
): ModeStepResult {
  const state = engine.getState(slug);
  if (!state) {
    return {
      ok: false,
      mode: "none",
      slug,
      phase: "change",
      action: "blocked",
      text: `Change not found: ${slug}`,
    };
  }

  const phase = state.currentPhase as PhaseId;
  const resolved = resolvePrimaryMode(taiyiRoot, explicitMode);
  let mode = resolved.mode;

  if (mode === "none") {
    if (explicitMode) {
      mode = explicitMode;
    } else if (state.autoHarness) {
      mode = "autopilot";
      activateMode(taiyiRoot, "autopilot", slug, { preserveOnDeactivate: true, meta: { phase } });
    } else {
      const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
      const plan = buildHarnessPlan(workspaceDir, taiyiRoot, state);
      return {
        ok: guide.qualityReady && plan.blockers.length === 0,
        mode: "none",
        slug,
        phase,
        action: requiresHumanGate(phase) ? "human-gate" : "harness",
        text: [
          "无活跃模式。加 --auto 或先说 ralph/autopilot/ultrawork 激活。",
          "",
          formatPhaseProgressLine(guide),
          formatHarnessPlanPlain(plan),
          "",
          formatGuidePlain(guide),
        ].join("\n"),
      };
    }
  }

  if (isWorkflowCompleted(state)) {
    return {
      ok: true,
      mode,
      slug,
      phase,
      action: "done",
      text: "✓ 九阶段已完成 → /taiyi:archive · /taiyi:stop-mode",
    };
  }

  if (mode === "ralph" || mode === "ultraqa") {
    const ralph = runRalphVerify(engine, workspaceDir, slug, { bumpRound: true });
    if (ralph.skipped && ralph.skipReason === "ralplan-first") {
      return {
        ok: false,
        mode,
        slug,
        phase,
        action: "blocked",
        text: ralph.text,
      };
    }
    if (ralph.ok) {
      return {
        ok: true,
        mode,
        slug,
        phase,
        action: mode === "ultraqa" ? "advanced" : "done",
        text: [
          ralph.text,
          "",
          mode === "ultraqa"
            ? "UltraQA：验收仍须 /taiyi:gstack qa · AC 对照"
            : "Ralph 验证已通过 → /taiyi:continue 或 /taiyi:stop-mode",
        ].join("\n"),
        verifyExitCode: 0,
      };
    }
    return {
      ok: false,
      mode,
      slug,
      phase,
      action: "ralph-fix",
      text: [
        ralph.text,
        "",
        "══ 勿结束会话（对标 OMC ralph stop-hook）══",
        "  1. /taiyi:sp systematic-debugging · /taiyi:agent debugger",
        "  2. 最小修复 · /taiyi:tdd dev",
        "  3. scripts/taiyi-forge.sh step（或 ralph）直到 ✓",
      ].join("\n"),
      verifyExitCode: ralph.exitCode,
    };
  }

  if (mode === "ultrawork") {
    if (phase !== "task" && phase !== "dev") {
      return {
        ok: false,
        mode,
        slug,
        phase,
        action: "blocked",
        text: [
          `Ultrawork 适用于 task/dev 阶段（当前 ${phase}）`,
          "  请先 /taiyi:continue 到 task 或 dev",
        ].join("\n"),
      };
    }
    activateMode(taiyiRoot, "ultrawork", slug, { linkedModes: ["ralph"] });
    const changeDir = engine.changeDir(slug);
    const taskMd = readTaskMd(changeDir);
    const plan = buildSpawnPlan(slug, phase, taskMd);
    const useTask = process.env.TAIYI_ULW_TASK !== "0";
    const autoTask = process.env.TAIYI_ULW_AUTO_TASK === "1";
    return {
      ok: true,
      mode,
      slug,
      phase,
      action: "harness",
      text: [
        "══ Ultrawork 步进 ══",
        formatSpawnPlanPlain(plan),
        "",
        useTask ? formatUltraworkTaskProtocol(plan, { autoDispatch: autoTask }) : "（TAIYI_ULW_TASK=0 时跳过 Task 示例）",
        "",
        "每切片完成后 scripts/taiyi-forge.sh ralph",
        "全部绿 → /taiyi:continue",
      ].join("\n"),
    };
  }

  if (mode === "team") {
    activateMode(taiyiRoot, "team", slug);
    const team = ensureTeamMode(taiyiRoot, slug, phase);
    const taskMd = readTaskMd(engine.changeDir(slug));
    return {
      ok: true,
      mode,
      slug,
      phase,
      action: "harness",
      text: formatTeamPipelinePlain(team, taskMd),
    };
  }

  if (mode === "autopilot" || mode === "ralplan" || mode === "plan") {
    activateMode(taiyiRoot, mode, slug, mode === "autopilot" ? { preserveOnDeactivate: true, meta: { phase } } : undefined);
  }

  if (phase === "review") {
    const review = runReviewMachineCheck(engine, slug, { bumpRound: false, workspaceDir });
    if (!review.ok) {
      return {
        ok: false,
        mode,
        slug,
        phase,
        action: "review-fix",
        text: [
          "Review 未过 → /taiyi:review-loop",
          review.text ?? "",
          "修 REVIEW.md 或代码后 scripts/taiyi-forge.sh step",
        ].join("\n"),
      };
    }
  }

  if (phase === "dev" || phase === "test") {
    const ralph = runRalphVerify(engine, workspaceDir, slug, { bumpRound: true });
    if (!ralph.ok && !ralph.skipped) {
      activateMode(taiyiRoot, "ralph", slug, { linkedModes: ["autopilot"] });
      return {
        ok: false,
        mode: "ralph",
        slug,
        phase,
        action: "ralph-fix",
        text: ralph.text,
        verifyExitCode: ralph.exitCode,
      };
    }
  }

  const cont = tryAutoContinue(engine, workspaceDir, taiyiRoot, slug);
  if (cont.advanced) {
    const after = engine.getState(slug);
    const nextPhase = (after?.currentPhase ?? phase) as PhaseId;
    return {
      ok: true,
      mode,
      slug,
      phase: nextPhase,
      action: isWorkflowCompleted(after!) ? "done" : "advanced",
      text: [
        "══ Autopilot 步进 ══",
        cont.text,
        "",
        isWorkflowCompleted(after!)
          ? "✓ 完成 → /taiyi:archive"
          : "下一步: scripts/taiyi-forge.sh step（或写当前阶段工件）",
      ].join("\n"),
    };
  }

  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  const plan = buildHarnessPlan(workspaceDir, taiyiRoot, state);
  const human = requiresHumanGate(phase);

  return {
    ok: !human,
    mode,
    slug,
    phase,
    action: human ? "human-gate" : plan.blockers.length ? "blocked" : "harness",
    text: [
      "══ Autopilot 步进（须 Agent 写工件/实现）══",
      formatPhaseProgressLine(guide),
      "",
      formatHarnessPlanPlain(plan),
      "",
      formatGuidePlain(guide),
      "",
      "完成后: scripts/taiyi-forge.sh step",
    ].join("\n"),
  };
}

export function formatActiveModesBanner(taiyiRoot: string): string {
  const active = listActiveModes(taiyiRoot);
  if (active.length === 0) return "";
  return active.map((a) => `[${a.mode}${a.slug ? `:${a.slug}` : ""}]`).join(" ");
}
