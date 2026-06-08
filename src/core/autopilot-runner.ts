import type { WorkflowEngine } from "./workflow-engine.js";
import { isWorkflowCompleted } from "./change-status.js";
import { buildPhaseGuide } from "./phase-guide.js";
import { formatGuidePlain, formatPhaseProgressLine } from "./format-guide.js";
import { formatPhaseAgentsPlain } from "./agent-roles.js";
import type { PhaseId } from "./types.js";
import { activateMode } from "./runtime/mode-state.js";
import { listActiveModes } from "./runtime/mode-state.js";

export type AutopilotRunResult = {
  ok: boolean;
  slug: string;
  text: string;
  autoHarness: boolean;
};

/** TaiyiForge 原生 autopilot — 九阶段 + orchestrator + loop + ralph（不依赖 OMC） */
export function runAutopilotGuide(
  engine: WorkflowEngine,
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
): AutopilotRunResult {
  const state = engine.getState(slug);
  if (!state) {
    return {
      ok: false,
      slug,
      autoHarness: false,
      text: [
        "Autopilot 需要已有变更 slug。",
        "  /taiyi:new <标题> --auto",
        "  或 scripts/taiyi-forge.sh init <slug> --auto --title \"…\"",
      ].join("\n"),
    };
  }

  const autoHarness = Boolean(state.autoHarness);
  const phase = state.currentPhase as PhaseId;
  activateMode(taiyiRoot, "autopilot", slug, { preserveOnDeactivate: true, meta: { phase } });
  const activeModes = listActiveModes(taiyiRoot);
  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  const done = isWorkflowCompleted(state);

  const lines: string[] = [
    "══ Taiyi Autopilot（原生 · 想法 → 可运行代码）══",
    formatPhaseProgressLine(guide),
    autoHarness ? "  模式: autoHarness ✓" : "  模式: 手动 — 请加 --auto 或 TAIYI_AUTO_HARNESS=1",
    activeModes.length > 0
      ? `  运行时: ${activeModes.map((m) => m.mode).join(", ")}`
      : "  运行时: （将随 ralph/team/ultrawork 激活）",
    "",
    "循环（每阶段）:",
    "  1. scripts/taiyi-forge.sh harness <slug>",
    "  2. @taiyi-orchestrator — 铁三角 → 辅助 mark-aux → 主 Skill 写工件",
    "  3. dev/test: /taiyi:tdd dev · /taiyi:apply · /taiyi:ralph",
    "  4. review: /taiyi:review-loop · /taiyi:health",
    "  5. /taiyi:continue（change/design/review 须 --approver）",
    "  6. 非人工门: /taiyi:loop",
    "",
    formatPhaseAgentsPlain(phase, slug),
    "",
    "停止: /taiyi:stop-mode · 放弃变更: /taiyi:cancel",
    "  /taiyi:commit → /taiyi:verify → /taiyi:ship → /taiyi:land → /taiyi:archive",
  ];

  if (done) {
    lines.push("", "✓ 九阶段已完成 → /taiyi:archive");
  } else {
    lines.push("", "当前指引:", formatGuidePlain(guide));
  }

  return {
    ok: autoHarness && !done,
    slug,
    autoHarness,
    text: lines.join("\n"),
  };
}
