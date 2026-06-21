import fs from "node:fs";
import path from "node:path";
import type { PhaseId, ChangeState } from "./types.js";
import { getPhase } from "./phase-registry.js";

function extractSection(content: string, heading: string, maxLines = 5): string {
  const regex = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const m = content.match(regex);
  if (!m) return "";
  const lines = m[1].trim().split("\n").filter(Boolean);
  return lines.slice(0, maxLines).join("\n");
}

function extractTitle(content: string): string {
  const m = content.match(/^#\s*(?:CHANGE:\s*)?(.+)$/m);
  return m?.[1]?.trim() ?? "";
}

function extractCheckboxes(content: string, maxItems = 6): string[] {
  const items: string[] = [];
  for (const line of content.split("\n")) {
    if (items.length >= maxItems) break;
    const m = line.match(/^[-*]\s*\[([ x])\]\s*(.+)$/);
    if (m) items.push(`${m[1] === "x" ? "✓" : "○"} ${m[2].trim()}`);
  }
  return items;
}

function summaryForPhase(phaseId: PhaseId, phaseMd: string): string {
  if (!phaseMd) return "";
  const title = extractTitle(phaseMd);
  switch (phaseId) {
    case "change": {
      const scope = extractSection(phaseMd, "Scope|范围|Motivation|动机", 4);
      return `**范围**: ${title}${scope ? "\n" + scope : ""}`;
    }
    case "requirement": {
      const acs = extractCheckboxes(phaseMd);
      return acs.length
        ? `**验收标准**:\n${acs.map((a) => `  - ${a}`).join("\n")}`
        : "";
    }
    case "design": {
      const decision = extractSection(phaseMd, "Decision|方案|决策|选择", 4);
      return decision ? `**技术决策**:\n${decision}` : `**设计**: ${title}`;
    }
    case "ui-design":
      return `**UI 契约**: ${title || "已定义"}`;
    case "task": {
      const tasks = extractSection(phaseMd, "Tasks|任务", 6);
      return tasks ? `**任务切片**:\n${tasks}` : "";
    }
    default:
      return "";
  }
}

function footerForPhase(
  currentPhase: PhaseId,
  state: ChangeState,
  changeDir: string,
): string {
  const phase = getPhase(currentPhase);
  const humanGated = new Set(["change", "design", "review"]);
  const needsApprover = humanGated.has(currentPhase);
  const artifactPath = path.join(changeDir, `${currentPhase.toUpperCase()}.md`);
  const hasArtifact = fs.existsSync(artifactPath) && fs.statSync(artifactPath).size > 0;

  const lines: string[] = [];
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`**当前**: ${currentPhase} · Skill: @${phase.skill} · 工件: ${currentPhase.toUpperCase()}.md`);
  if (state.complexity) lines.push(`**复杂度**: ${state.complexity.level} | Profile: ${state.profile}`);
  if (!hasArtifact) {
    lines.push(`**下一步**: 加载 @${phase.skill}，编辑 ${currentPhase.toUpperCase()}.md`);
  } else {
    lines.push(`**下一步**: /taiyi:continue${needsApprover ? ` --approver "你的名字"` : ""}`);
  }
  lines.push("");
  lines.push("*引擎生成 · Agent 读此文件即可*");
  return lines.join("\n");
}

export function appendPhaseToContext(
  changeDir: string,
  slug: string,
  justCompletedPhase: PhaseId,
  nextPhase: PhaseId,
  state: ChangeState,
): void {
  const ctxPath = path.join(changeDir, "PHASE-CONTEXT.md");

  // Read just-completed phase markdown
  const phaseMdPath = path.join(changeDir, `${justCompletedPhase.toUpperCase()}.md`);
  let phaseMd = "";
  try { phaseMd = fs.readFileSync(phaseMdPath, "utf8"); } catch { /* no-op */ }

  const summary = summaryForPhase(justCompletedPhase, phaseMd);
  const appendBlock = summary
    ? `## ${justCompletedPhase} (✓)\n${summary}\n`
    : `## ${justCompletedPhase} (✓)\n`;

  let existing = "";
  if (fs.existsSync(ctxPath)) {
    existing = fs.readFileSync(ctxPath, "utf8");
    // Find last completed phase section, insert after it
    const lastCompletedIdx = existing.lastIndexOf("(✓)");
    if (lastCompletedIdx >= 0) {
      // Find end of that line
      const lineEnd = existing.indexOf("\n", lastCompletedIdx);
      const insertPos = lineEnd >= 0 ? lineEnd + 1 : existing.length;
      // Insert before the "---" separator
      const sepIdx = existing.indexOf("\n---", insertPos);
      const before = sepIdx >= 0 ? existing.slice(0, sepIdx) : existing;
      const after = sepIdx >= 0 ? existing.slice(sepIdx) : "";
      existing = before + "\n" + appendBlock + "\n" + after.trimStart();
    } else {
      // No completed phases yet, insert after header
      const headerEnd = existing.indexOf("\n---");
      const before = headerEnd >= 0 ? existing.slice(0, headerEnd) : existing;
      const after = headerEnd >= 0 ? existing.slice(headerEnd) : "";
      existing = before + "\n" + appendBlock + "\n" + after.trimStart();
    }
  } else {
    // New file
    existing = `# Phase Context — ${slug}\n\n${appendBlock}`;
  }

  // Replace footer with current phase info
  const sepIdx = existing.lastIndexOf("\n---");
  const body = sepIdx >= 0 ? existing.slice(0, sepIdx) : existing;
  const final = body + footerForPhase(nextPhase, state, changeDir);

  fs.writeFileSync(ctxPath, final, "utf8");
}
