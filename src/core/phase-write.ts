import type { WorkflowEngine } from "./workflow-engine.js";
import { getPhase, listPhases } from "./phase-registry.js";
import { buildPhaseGuide } from "./phase-guide.js";
import { requiresHumanGate } from "./gates/human-gate-config.js";
import { isWorkflowCompleted, completedWorkflowMessage } from "./change-status.js";
import type { PhaseId } from "./types.js";
import { resolveTaiyiRoot } from "./paths.js";

export type PhaseWriteHint = {
  superpowers: string[];
  superpowersOptional: string[];
  auxiliary: string[];
  external: string[];
  slashExtras: string[];
  notes: string[];
};

/** 写工件斜杠 — 与 workflow-manifest.yaml 对齐的精简提示 */
export const PHASE_WRITE_HINTS: Record<PhaseId, PhaseWriteHint> = {
  change: {
    superpowers: ["brainstorming"],
    superpowersOptional: [],
    auxiliary: ["taiyi-intel-scan"],
    external: [],
    slashExtras: ["/taiyi:explore"],
    notes: [
      "Schema 驱动 — Agent 须调用 executor.generateStageData(ChangeSchema) 生成 change.json",
      "quality gate 要求 change.json 通过 Zod 校验，否则 complete 被拒",
      "写完 CHANGE.md → 手写或调用 LLM 生成 change.json → continue",
    ],
  },
  requirement: {
    superpowers: [],
    superpowersOptional: [],
    auxiliary: [],
    external: [],
    slashExtras: [],
    notes: [
      "Schema 驱动：调用 executor.generateStageData(RequirementSchema) → persistAndRender 写 requirement.json + REQUIREMENT.md",
      "禁止手写 MD：数据真源是 requirement.json，MD 由 Handlebars 自动渲染",
      "quality gate 要求 requirement.json 通过 Zod 校验",
    ],
  },
  design: {
    superpowers: [],
    superpowersOptional: [],
    auxiliary: ["taiyi-architect"],
    external: ["/taiyi:skill ecc architecture-audit"],
    slashExtras: ["/taiyi:diagram-pipeline"],
    notes: [
      "Schema 驱动：调用 executor.generateStageData(DesignSchema) → persistAndRender 写 design.json + DESIGN.md",
      "禁止手写 MD：数据真源是 design.json，MD 由 Handlebars 自动渲染",
      "quality gate 要求 design.json 通过 Zod 校验",
      "DESIGN.md 须含 ## Options 表格（≥2 方案）+ ## Decision（Chosen + Reason）",
    ],
  },
  "ui-design": {
    superpowers: [],
    superpowersOptional: [],
    auxiliary: ["taiyi-restyle"],
    external: ["/taiyi:skill ecc web-design-guidelines"],
    slashExtras: [],
    notes: ["UI 契约 + 无障碍；无 UI 也须 ## Links 指向 DESIGN/REQUIREMENT"],
  },
  task: {
    superpowers: [],
    superpowersOptional: ["using-git-worktrees"],
    auxiliary: ["taiyi-diagram-flow"],
    external: ["/taiyi:skill ecc planner", "/taiyi:skill ecc tdd-workflow", "/taiyi:skill ecc autonomous-loops"],
    slashExtras: ["/taiyi:tdd plan", "/taiyi:diagram-flow"],
    notes: ["独立可 PR 切片；Checklist 须含测试先行/RED/npm test"],
  },
  dev: {
    superpowers: [],
    superpowersOptional: ["using-git-worktrees"],
    auxiliary: [],
    external: ["/taiyi:skill ecc tdd-workflow", "/taiyi:skill ecc agent-introspection-debugging", "/taiyi:skill ecc autonomous-loops"],
    slashExtras: ["/taiyi:tdd dev", "/taiyi:apply", "/taiyi:ralph", "/taiyi:ultrawork"],
    notes: [
      "TDD 红绿重构；完成须 .dev-complete",
      ".dev-complete 格式：第一行 `command: npx tsc --noEmit && npx vitest run`，第二行 `exitCode: 0`",
      "缺少 command: 行或 exitCode: 0 → quality gate 被拒",
    ],
  },
  test: {
    superpowers: [],
    superpowersOptional: [],
    auxiliary: ["taiyi-evolve"],
    external: ["/taiyi:e2e", "/taiyi:ui-test", "/taiyi:skill ecc verification-loop"],
    slashExtras: ["/taiyi:apply"],
    notes: ["TEST.md 须有真实运行证据表格；ECC verification-loop 提供证据检查"],
  },
  review: {
    superpowers: [],
    superpowersOptional: ["receiving-code-review"],
    auxiliary: ["taiyi-health"],
    external: ["/taiyi:security", "/taiyi:skill ecc code-review"],
    slashExtras: ["/taiyi:review-loop", "/taiyi:health"],
    notes: ["Verdict 须 - [x] **Approve**（勿写 PASS 文本）；人工门"],
  },
  integration: {
    superpowers: [],
    superpowersOptional: [],
    auxiliary: [],
    external: ["/taiyi:release", "/taiyi:skill ecc delivery-gate", "/taiyi:skill ecc verification-loop"],
    slashExtras: ["/taiyi:commit", "/taiyi:verify", "/taiyi:archive"],
    notes: ["CHANGELOG + 交付门（git commit + 干净工作区）"],
  },
};

export const PHASE_SLASH_VERB: Record<PhaseId, string> = {
  change: "change",
  requirement: "requirement",
  design: "design",
  "ui-design": "ui-design",
  task: "task",
  dev: "dev",
  test: "test",
  review: "review",
  integration: "integration",
};

export function phaseIdFromSlashVerb(verb: string): PhaseId | undefined {
  const normalized = verb.trim().toLowerCase();
  for (const phase of listPhases()) {
    if (PHASE_SLASH_VERB[phase.id] === normalized) return phase.id;
  }
  return undefined;
}

export type PhaseWriteResult = {
  ok: boolean;
  slug: string;
  phase: PhaseId;
  targetPhase: PhaseId;
  skill: string;
  artifact: string;
  text: string;
  mismatch?: boolean;
  skipped?: boolean;
};

function formatHintBlock(hints: PhaseWriteHint): string[] {
  const lines: string[] = [];
  if (hints.superpowers.length) {
    lines.push(`  Superpowers: ${hints.superpowers.map((s) => `/taiyi:sp ${s}`).join(" · ")}`);
  }
  if (hints.superpowersOptional.length) {
    lines.push(`  可选 SP: ${hints.superpowersOptional.map((s) => `/taiyi:sp ${s}`).join(" · ")}`);
  }
  if (hints.auxiliary.length) {
    lines.push(`  辅助: ${hints.auxiliary.map((s) => `@${s}`).join(" · ")}（完成后 mark-aux）`);
  }
  if (hints.external.length) {
    lines.push(`  外挂: ${hints.external.join(" · ")}`);
  }
  if (hints.slashExtras.length) {
    lines.push(`  相关斜杠: ${hints.slashExtras.join(" · ")}`);
  }
  for (const n of hints.notes) {
    lines.push(`  · ${n}`);
  }
  return lines;
}

export function runPhaseWriteGuide(
  engine: WorkflowEngine,
  workspaceDir: string,
  taiyiRoot: string,
  slug: string,
  targetPhase?: PhaseId,
): PhaseWriteResult {
  const state = engine.getState(slug);
  if (!state) {
    return {
      ok: false,
      slug,
      phase: "change",
      targetPhase: targetPhase ?? "change",
      skill: "",
      artifact: "",
      text: `Change not found: ${slug}`,
    };
  }

  const current = state.currentPhase as PhaseId;
  const phase = targetPhase ?? current;
  const def = getPhase(phase);
  const hints = PHASE_WRITE_HINTS[phase];
  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);

  if (isWorkflowCompleted(state)) {
    return {
      ok: false,
      slug,
      phase: current,
      targetPhase: phase,
      skill: def.skill,
      artifact: def.artifact,
      text: [
        `变更 ${slug} 已完成（${completedWorkflowMessage(state)}）`,
        `  勿写 ${phase} 工件；只读: scripts/taiyi-forge.sh verify ${slug}`,
        "  若未物理归档: scripts/taiyi-forge.sh archive " + slug,
      ].join("\n"),
      skipped: true,
    };
  }

  const skipped = (guide.skippedPhases ?? []).includes(phase);
  const mismatch = phase !== current;

  const lines: string[] = [
    `══ 写工件 · ${phase} ══`,
    `  slug: ${slug}`,
    `  引擎当前阶段: ${current}${mismatch ? `（请求写 ${phase}）` : ""}`,
    `  Skill: **${def.skill}**`,
    `  产出: \`.taiyi/changes/${slug}/${def.artifact}\`${def.kind === "code" ? " + 代码 + .dev-complete" : ""}`,
    "",
  ];

  if (skipped) {
    lines.push(`  ⚠ profile ${guide.profile} 跳过阶段 ${phase} — 勿写此工件`);
    lines.push("");
  }

  if (mismatch) {
    lines.push("  ⚠ 阶段不一致：优先写当前阶段工件，或先 /taiyi:continue 推进");
    lines.push(`  当前应写: /taiyi:write`);
    lines.push("");
  }

  lines.push("加载与执行:");
  lines.push(`  1. 读 Skill \`${def.skill}\`（= \`@${def.skill}\`）`);
  lines.push(...formatHintBlock(hints));
  lines.push("");
  lines.push("引擎核对:");
  lines.push("  scripts/taiyi-forge.sh status " + slug);
  lines.push(`  quality 就绪 → /taiyi:continue${requiresHumanGate(phase) ? ' --approver "名字"' : ""}`);

  if (phase === "dev") {
    lines.push("  实现后: /taiyi:ralph → status → continue（dev；test 阶段同理）");
  }

  return {
    ok: !skipped && !mismatch,
    slug,
    phase: current,
    targetPhase: phase,
    skill: def.skill,
    artifact: def.artifact,
    text: lines.join("\n"),
    mismatch,
    skipped,
  };
}

export function formatWriteCurrentPhasePlain(
  engine: WorkflowEngine,
  workspaceDir: string,
  slug: string,
): string {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return `Change not found: ${slug}`;
  const phase = state.currentPhase as PhaseId;
  return runPhaseWriteGuide(engine, workspaceDir, taiyiRoot, slug, phase).text;
}
