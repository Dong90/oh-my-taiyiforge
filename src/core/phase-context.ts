import fs from "node:fs";
import path from "node:path";
import type { PhaseId, ChangeState } from "./types.js";
import { getPhase } from "./phase-registry.js";
import { AgentContext } from "./change-graph/agent-sdk.js";
import { resolveArchTemplateForChange } from "./profile.js";

/* ──────────────────────────────────────────────
 * Graph-native Phase Context (Phase B)
 * Replaces regex-based Markdown extraction with
 * ChangeGraph rendering. Agents read graph, not files.
 * ────────────────────────────────────────────── */

/**
 * Generate PHASE-CONTEXT.md from the ChangeGraph.
 * Delegates to AgentContext for graph loading + rendering.
 *
 * This supersedes appendPhaseToContext() — agents read graph, not regex-extracted text.
 */
export function generateGraphPhaseContext(
  changeDir: string,
  slug: string,
): { ok: boolean; error?: string } {
  try {
    const sdk = AgentContext.fromChangeDir(changeDir, slug);
    sdk.writePhaseContext();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ──────────────────────────────────────────────
 * Legacy: regex-based Markdown extraction
 * Kept for backward compatibility during Phase B transition.
 * @deprecated — use generateGraphPhaseContext()
 * ────────────────────────────────────────────── */

function extractSection(content: string, heading: string, maxLines = 5): string {
  // heading may contain | alternations for multi-language (e.g. "Decision|方案|决策|选择").
  // Wrap in non-capturing group so the capture group ([\s\S]*?) always captures section body.
  // Also handle "## Step N: Heading" format used by templates (e.g. "## Step 4: Decision").
  const regex = new RegExp(
    `##\\s+(?:Step\\s+\\d+:\\s+)?(?:${heading})\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i",
  );
  const m = content.match(regex);
  if (!m) return "";
  const lines = m[1].trim().split("\n").filter(Boolean);
  return lines.slice(0, maxLines).join("\n");
}

function extractTitle(content: string): string {
  // Match "# CHANGE: Title" | "# DESIGN: Title" | "# Title" — strip phase prefix for cleaner summary.
  const m = content.match(/^#\s*(?:[A-Z-]+:\s*)?(.+)$/m);
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
  const title = extractTitle(phaseMd);
  switch (phaseId) {
    case "change": {
      const scope = extractSection(phaseMd, "Scope|范围|Motivation|动机|Problem Statement", 4);
      const risks = extractSection(phaseMd, "Risks|风险", 3);
      const rollback = extractSection(phaseMd, "Rollback|回滚", 2);
      const parts = [`**范围**: ${title}`];
      if (scope) parts.push(scope);
      if (risks) parts.push(`**风险**:\n${risks}`);
      if (rollback) parts.push(`**回滚**: ${rollback}`);
      return parts.join("\n");
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
      const tasks = extractSection(phaseMd, "Slice Breakdown|Tasks|任务|切片", 6);
      return tasks ? `**任务切片**:\n${tasks}` : "";
    }
    case "dev": {
      const dev = extractSection(phaseMd, "Implementation|实现|Dev", 4);
      return dev ? `**开发**:\n${dev}` : `**开发**: ${title || "TDD 已完成"}`;
    }
    case "test": {
      const test = extractSection(phaseMd, "Test Plan|Results|测试", 4);
      return test ? `**测试**:\n${test}` : `**测试**: ${title || "测试已通过"}`;
    }
    case "review": {
      const verdict = extractSection(phaseMd, "Verdict|裁决|评审", 3);
      return verdict ? `**评审**:\n${verdict}` : `**评审**: ${title || "已评审"}`;
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
  lines.push("");
  lines.push("<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。");
  lines.push("     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->");
  return lines.join("\n");
}

/**
 * 从 taiyi-intel-scan 产出的 CONTEXT.md 提取项目级上下文，
 * 自动注入到 PHASE-CONTEXT.md 的 PROJECT-CONTEXT 区域。
 * 只在首次（尚无项目上下文标记）时执行，后续不覆盖。
 */
function injectProjectContextIfMissing(ctxPath: string, changeDir: string): boolean {
  const PROJECT_MARKER = "<!-- PROJECT-CONTEXT-END -->";

  // Already has project context — skip
  if (fs.existsSync(ctxPath)) {
    const existing = fs.readFileSync(ctxPath, "utf8");
    if (existing.includes(PROJECT_MARKER)) return false;
  }

  // Look for CONTEXT.md from intel-scan in the change directory
  const contextPath = path.join(changeDir, "CONTEXT.md");
  if (!fs.existsSync(contextPath)) return false;

  const contextContent = fs.readFileSync(contextPath, "utf8").trim();
  // Don't inject if it's still a seed template
  if (contextContent.length < 50 || contextContent.includes("<!-- seed -->")) return false;

  const projectBlock = [
    "<!-- 项目级上下文 · 来自 taiyi-intel-scan · 引擎自动维护 -->",
    "## Project Context",
    "",
    contextContent,
    "",
    PROJECT_MARKER,
    "",
  ].join("\n");

  if (fs.existsSync(ctxPath)) {
    const existing = fs.readFileSync(ctxPath, "utf8");
    fs.writeFileSync(ctxPath, projectBlock + existing, "utf8");
  } else {
    fs.writeFileSync(ctxPath, projectBlock, "utf8");
  }

  return true;
}

export function appendPhaseToContext(
  changeDir: string,
  slug: string,
  justCompletedPhase: PhaseId,
  nextPhase: PhaseId,
  state: ChangeState,
): void {
  const ctxPath = path.join(changeDir, "PHASE-CONTEXT.md");
  const PROJECT_MARKER = "<!-- PROJECT-CONTEXT-END -->";

  // Auto-inject project context from intel-scan CONTEXT.md on first creation
  injectProjectContextIfMissing(ctxPath, changeDir);

  // Read just-completed phase markdown
  const phaseMdPath = path.join(changeDir, `${justCompletedPhase.toUpperCase()}.md`);
  let phaseMd = "";
  try { phaseMd = fs.readFileSync(phaseMdPath, "utf8"); } catch { /* no-op */ }

  const summary = summaryForPhase(justCompletedPhase, phaseMd);
  const appendBlock = summary
    ? `## ${justCompletedPhase} (✓)\n${summary}\n`
    : `## ${justCompletedPhase} (✓)\n`;

  // Bridge: when design phase completes, resolve arch template and inject
  // architecture conventions into PHASE-CONTEXT.md so dev agents read them
  let archBlock = "";
  if (justCompletedPhase === "design") {
    try {
      const archTemplate = resolveArchTemplateForChange(state.profile, changeDir);
      if (archTemplate.contextGuide) {
        archBlock = `\n**架构约定**:\n\`\`\`\n${archTemplate.contextGuide}\n\`\`\`\n`;
      }
    } catch { /* best-effort — arch template is optional */ }
  }

  let projectContext = "";
  let existing = "";
  if (fs.existsSync(ctxPath)) {
    existing = fs.readFileSync(ctxPath, "utf8");
    // Preserve project-level context before PROJECT_MARKER
    const markerIdx = existing.indexOf(PROJECT_MARKER);
    if (markerIdx >= 0) {
      projectContext = existing.slice(0, markerIdx + PROJECT_MARKER.length + 1);
      existing = existing.slice(projectContext.length);
    }
    // Find last completed phase section, insert after it
    const lastCompletedIdx = existing.lastIndexOf("(✓)");
    if (lastCompletedIdx >= 0) {
      const lineEnd = existing.indexOf("\n", lastCompletedIdx);
      const insertPos = lineEnd >= 0 ? lineEnd + 1 : existing.length;
      const sepIdx = existing.indexOf("\n---", insertPos);
      const before = sepIdx >= 0 ? existing.slice(0, sepIdx) : existing;
      const after = sepIdx >= 0 ? existing.slice(sepIdx) : "";
      existing = before + "\n" + appendBlock + (archBlock ? "\n" + archBlock : "") + "\n" + after.trimStart();
    } else {
      const headerEnd = existing.indexOf("\n---");
      const before = headerEnd >= 0 ? existing.slice(0, headerEnd) : existing;
      const after = headerEnd >= 0 ? existing.slice(headerEnd) : "";
      existing = before + "\n" + appendBlock + (archBlock ? "\n" + archBlock : "") + "\n" + after.trimStart();
    }
  } else {
    existing = `# Phase Context — ${slug}\n\n${appendBlock}` + (archBlock ? "\n" + archBlock : "");
  }

  // Replace footer with current phase info
  const sepIdx = existing.lastIndexOf("\n---");
  const body = sepIdx >= 0 ? existing.slice(0, sepIdx) : existing;
  const final = projectContext + body + footerForPhase(nextPhase, state, changeDir);

  fs.writeFileSync(ctxPath, final, "utf8");
}
