import type { PhaseGuide } from "./phase-guide.js";
import type { ChangeSummary } from "./list-changes.js";
import type { PhaseId } from "./types.js";
import { listPhases } from "./phase-registry.js";

function profilePhaseOrdinal(
  skippedPhases: PhaseId[] | undefined,
  phaseId: PhaseId,
): { index: number; total: number } {
  const skipped = new Set(skippedPhases ?? []);
  const chain = listPhases().filter((p) => !skipped.has(p.id));
  const idx = chain.findIndex((p) => p.id === phaseId);
  return {
    index: idx >= 0 ? idx + 1 : chain.length,
    total: chain.length,
  };
}

function workflowPhaseLabel(total: number): string {
  if (total === 5) return "五阶段";
  if (total === 9) return "九阶段";
  return `${total} 阶段`;
}

function formatIntentLine(guide: PhaseGuide): string | null {
  const s = guide.intentSignals;
  if (!s) return null;
  const parts = [
    `模块≈${s.touchedModules}`,
    s.hasUi ? "含 UI" : "无 UI",
    `测试层级≈${s.testLevels}`,
  ];
  if (guide.complexity) {
    parts.push(`复杂度 ${guide.complexity.level}(${guide.complexity.score})`);
  }
  return `意图分析: ${parts.join(" · ")}`;
}

/** 单行阶段进度（continue / status 顶部） */
export function formatPhaseProgressLine(guide: PhaseGuide): string {
  if (guide.workflowAborted) {
    return `阶段: 已取消 (aborted)，可新建变更`;
  }
  if (guide.workflowCompleted) {
    return `阶段: 已完成 ✓ (${guide.completedCount}/${guide.totalPhases})，可归档`;
  }
  if (guide.earlyCodeWarning && guide.currentPhase !== "dev" && guide.currentPhase !== "test") {
    const { index, total } = profilePhaseOrdinal(guide.skippedPhases, guide.currentPhase);
    return `当前: ${guide.currentPhase}（${index}/${total}）| ⚠ dev 前有业务代码改动`;
  }
  const { index, total } = profilePhaseOrdinal(guide.skippedPhases, guide.currentPhase);
  const impl = guide.currentPhase === "dev" || guide.currentPhase === "test";
  const verb = impl ? "apply 或 continue" : "continue 过关";
  return `当前: ${guide.currentPhase}（${index}/${total}）| Skill: ${guide.skill} | 推进: ${verb}`;
}

/** /taiyi:status --compact — Agent/终端短输出（无 footer） */
export function formatStatusCompact(guide: PhaseGuide): string {
  const lines: string[] = [`# ${guide.slug}`, formatPhaseProgressLine(guide)];
  if (guide.workflowCompleted) {
    return lines.join("\n");
  }
  const artifactStatus = guide.qualityReady
    ? "ready"
    : guide.artifactIsSeed
      ? "seed"
      : "!ready";
  const nextOneLine = guide.nextAction?.replace(/\n/g, " → ") ?? "";
  lines.push(`artifact=${guide.artifact} (${artifactStatus}) | ${nextOneLine}`);
  if (guide.stepBlockers?.length) {
    lines.push(`blockers: ${guide.stepBlockers.join("; ")}`);
  }
  if (guide.earlyCodeWarning) {
    lines.push(`⚠ ${guide.earlyCodeWarning}`);
  } else if (guide.qualityHints.length && !guide.qualityReady) {
    lines.push(`hints: ${guide.qualityHints.slice(0, 2).join("; ")}`);
  }
  if (guide.blockedByWarnings?.length) {
    lines.push(`⚠ blocked_by: ${guide.blockedByWarnings.join("; ")}`);
  }
  return lines.join("\n");
}

/** /taiyi:status 人类可读摘要 */
export function formatStatusPlain(guide: PhaseGuide): string {
  const lines: string[] = [];
  lines.push(`# ${guide.slug}`);
  lines.push(formatPhaseProgressLine(guide));
  const intent = formatIntentLine(guide);
  if (intent) lines.push(intent);
  if (guide.tokenBudgetLine) lines.push(guide.tokenBudgetLine);
  if (guide.healthGateLine) {
    lines.push("");
    lines.push(guide.healthGateLine);
  }
  if (guide.skillFlowLine) {
    lines.push("");
    lines.push(guide.skillFlowLine);
  }
  lines.push("");
  if (guide.workflowCompleted) {
    lines.push(`${workflowPhaseLabel(guide.totalPhases)}已全部完成，可归档`);
    return lines.join("\n");
  }
  const artifactStatus = guide.qualityReady
    ? "就绪"
    : guide.artifactIsSeed
      ? "模板占位（须按 Skill 填写）"
      : "未就绪";
  lines.push(`工件: ${guide.artifact} (${artifactStatus})`);
  if (guide.syncActions?.length) {
    lines.push("");
    lines.push("已自动对齐:");
    for (const a of guide.syncActions) lines.push(`  ${a}`);
  }
  if (guide.stepBlockers?.length) {
    lines.push("");
    lines.push("顺序冲突（须按步推进）:");
    for (const b of guide.stepBlockers) lines.push(`  ${b}`);
  }
  if (guide.earlyCodeWarning) {
    lines.push("");
    lines.push(`⚠ 代码漂移: ${guide.earlyCodeWarning}`);
  }
  if (guide.autoHarness) lines.push("模式: 全自动 (--auto)");
  if (guide.pendingAuxiliary.length) {
    lines.push(`待做辅助: ${guide.pendingAuxiliary.join(", ")}`);
  }
  if (guide.qualityHints.length) {
    lines.push("");
    lines.push("待完善:");
    for (const h of guide.qualityHints) lines.push(`  - ${h}`);
  }
  lines.push("");
  lines.push(`系统建议: ${guide.nextAction}`);
  if (guide.nextSkill) lines.push(`过关后 Skill: ${guide.nextSkill}`);
  lines.push("");
  lines.push("常用: status · write · continue · apply（dev/test）· review-loop（review 机器审查）");
  return lines.join("\n");
}

export function formatGuidePlain(guide: PhaseGuide): string {
  const lines: string[] = [];
  lines.push(`# TaiyiForge · ${guide.slug}`);
  lines.push("");
  lines.push(formatPhaseProgressLine(guide));
  const intent = formatIntentLine(guide);
  if (intent) lines.push(intent);
  if (guide.tokenBudgetLine) lines.push(guide.tokenBudgetLine);
  if (guide.skillFlowLine) {
    lines.push("");
    lines.push(guide.skillFlowLine);
  }
  lines.push("");
  if (guide.autoHarness) {
    lines.push("模式: 全自动 (--auto，过关前须 harness-check)");
  }
  if (guide.currentPhase === "change" && guide.completedCount === 0) {
    lines.push(
      "说明: new/init 仅创建当前阶段模板；后续阶段模板在上一阶段过关后生成",
    );
  }
  if (guide.profile) lines.push(`Profile: ${guide.profile}`);
  if (guide.skippedPhases?.length) {
    lines.push(`跳过: ${guide.skippedPhases.join(", ")}`);
  }
  lines.push(`Skill: ${guide.skill}`);
  lines.push(`工件: ${guide.artifactPath}`);
  lines.push(
    `质量就绪: ${guide.qualityReady ? "是" : guide.artifactIsSeed ? "否（模板占位）" : "否"}`,
  );
  if (guide.syncActions?.length) {
    lines.push("");
    lines.push("已自动对齐:");
    for (const a of guide.syncActions) lines.push(`  ${a}`);
  }
  if (guide.stepBlockers?.length) {
    lines.push("");
    lines.push("顺序冲突（须按步推进）:");
    for (const b of guide.stepBlockers) lines.push(`  ${b}`);
  }
  if (guide.earlyCodeWarning) {
    lines.push("");
    lines.push(`⚠ 代码漂移: ${guide.earlyCodeWarning}`);
  }
  if (guide.complexity) {
    lines.push(`复杂度: ${guide.complexity.level} (score ${guide.complexity.score})`);
    if (guide.complexity.recommendedProfile && guide.complexity.recommendedProfile !== guide.profile) {
      lines.push(`  💡 建议: --profile ${guide.complexity.recommendedProfile}（当前 ${guide.profile}）`);
    }
  }
  if (guide.pendingAuxiliary.length) {
    lines.push(`待做辅助: ${guide.pendingAuxiliary.join(", ")}`);
  }
  if (guide.qualityHints.length) {
    lines.push("");
    lines.push("质量提示:");
    for (const h of guide.qualityHints) lines.push(`  - ${h}`);
  }
  if (guide.harness?.hooks?.length) {
    lines.push("");
    lines.push(guide.autoHarness ? "双线 harness（auto 须必选打卡，可选见标注）:" : "双线 harness 推荐:");
    for (const h of guide.harness.hooks) {
      const opt = h.optional ? " (可选)" : "";
      lines.push(`  - ${h.tool}: ${h.skill ?? h.command ?? ""} (${h.when})${opt}`);
    }
  }
  if (guide.autoHarness) {
    lines.push("");
    lines.push(`编排: harness-check → continue 过关（或 taiyi-forge.sh harness ${guide.slug}）`);
  }
  lines.push("");
  lines.push(`→ ${guide.nextAction}`);
  if (guide.nextSkill) lines.push(`下一步 Skill: ${guide.nextSkill}`);
  return lines.join("\n");
}

export function formatChangeListPlain(changes: ChangeSummary[]): string {
  if (changes.length === 0) return "（无匹配变更，可新建；归档用 list --archived，全量用 list --all [--archived]）";
  return changes
    .map((c) => {
      const phase = c.workflowCompleted ? "completed" : c.workflowAborted ? "aborted" : c.currentPhase;
      const tag = c.archived ? "\t[archived]" : c.isSeed ? "\t[seed]" : "";
      return `${c.slug}\t${phase}\t${c.completed}/${c.total}\t${c.profile}${c.complexity ? `\t${c.complexity}` : ""}${tag}`;
    })
    .join("\n");
}
