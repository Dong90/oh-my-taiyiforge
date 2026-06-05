import type { PhaseGuide } from "./phase-guide.js";
import type { ChangeSummary } from "./list-changes.js";

export function formatGuidePlain(guide: PhaseGuide): string {
  const lines: string[] = [];
  lines.push(`# TaiyiForge · ${guide.slug}`);
  lines.push("");
  if (guide.workflowCompleted) {
    lines.push(`阶段: 已完成 ✓ (${guide.completedCount}/${guide.totalPhases})`);
  } else {
    lines.push(`阶段: ${guide.currentPhase}`);
  }
  if (guide.autoHarness) lines.push(`模式: 全自动 (--auto)`);
  if (guide.profile) lines.push(`Profile: ${guide.profile}`);
  if (guide.skippedPhases?.length) {
    lines.push(`跳过: ${guide.skippedPhases.join(", ")}`);
  }
  lines.push(`Skill: ${guide.skill}`);
  lines.push(`工件: ${guide.artifactPath}`);
  lines.push(`质量就绪: ${guide.qualityReady ? "是" : "否"}`);
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
    lines.push(guide.autoHarness ? "铁三角（auto 须全部打卡）:" : "铁三角推荐:");
    for (const h of guide.harness.hooks) {
      lines.push(`  - ${h.tool}: ${h.skill ?? h.command ?? ""} (${h.when})`);
    }
  }
  if (guide.autoHarness) {
    lines.push("");
    lines.push(`编排: npx taiyi harness ${guide.slug}`);
  }
  lines.push("");
  lines.push(`→ ${guide.nextAction}`);
  if (guide.nextSkill) lines.push(`下一步 Skill: ${guide.nextSkill}`);
  return lines.join("\n");
}

export function formatChangeListPlain(changes: ChangeSummary[]): string {
  if (changes.length === 0) return "（无进行中的变更，使用 taiyi init <slug> 创建）";
  return changes
    .map((c) => {
      const phase = c.workflowCompleted ? "completed" : c.currentPhase;
      return `${c.slug}\t${phase}\t${c.completed}/${c.total}\t${c.profile}${c.complexity ? `\t${c.complexity}` : ""}`;
    })
    .join("\n");
}
