import type { PhaseGuide } from "./phase-guide.js";
import type { ChangeSummary } from "./list-changes.js";
import { getPhase } from "./phase-registry.js";

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
    return `阶段: 已取消 (aborted) → /taiyi:new`;
  }
  if (guide.workflowCompleted) {
    return `阶段: 已完成 ✓ (${guide.completedCount}/${guide.totalPhases}) → /taiyi:archive`;
  }
  if (guide.earlyCodeWarning && guide.currentPhase !== "dev" && guide.currentPhase !== "test") {
    const order = getPhase(guide.currentPhase).order;
    return `当前: ${guide.currentPhase}（${order}/${guide.totalPhases}）| ⚠ dev 前有业务代码改动`;
  }
  const order = getPhase(guide.currentPhase).order;
  const impl = guide.currentPhase === "dev" || guide.currentPhase === "test";
  const verb = impl ? "/taiyi:apply" : "/taiyi:continue";
  return `当前: ${guide.currentPhase}（${order}/${guide.totalPhases}）| Skill: ${guide.skill} | 推进: ${verb}`;
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
    lines.push("九阶段已全部完成。归档: /taiyi:archive");
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
  lines.push(`下一步: ${guide.nextAction}`);
  if (guide.nextSkill) lines.push(`过关后 Skill: ${guide.nextSkill}`);
  lines.push("");
  lines.push("常用: /taiyi:status | /taiyi:continue | /taiyi:apply（dev/test）| /taiyi:loop | /taiyi:review-loop（review 机器审查）");
  lines.push("次数: /taiyi:continue x3 · /taiyi:apply x2 · /taiyi:loop x10");
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
    lines.push(guide.autoHarness ? "铁三角（auto 须必选打卡，可选见标注）:" : "铁三角推荐:");
    for (const h of guide.harness.hooks) {
      const opt = h.optional ? " (可选)" : "";
      lines.push(`  - ${h.tool}: ${h.skill ?? h.command ?? ""} (${h.when})${opt}`);
    }
  }
  if (guide.autoHarness) {
    lines.push("");
    lines.push(`编排: /taiyi:continue（或 taiyi-forge.sh harness ${guide.slug}）`);
  }
  lines.push("");
  lines.push(`→ ${guide.nextAction}`);
  if (guide.nextSkill) lines.push(`下一步 Skill: ${guide.nextSkill}`);
  return lines.join("\n");
}

export function formatChangeListPlain(changes: ChangeSummary[]): string {
  if (changes.length === 0) return "（无变更 → /taiyi:new <名称>）";
  return changes
    .map((c) => {
      const phase = c.workflowCompleted ? "completed" : c.workflowAborted ? "aborted" : c.currentPhase;
      return `${c.slug}\t${phase}\t${c.completed}/${c.total}\t${c.profile}${c.complexity ? `\t${c.complexity}` : ""}`;
    })
    .join("\n");
}
