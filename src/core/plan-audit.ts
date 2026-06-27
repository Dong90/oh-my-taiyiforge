import fs from "node:fs";
import { getLogger } from "./logger.js";
import { isSeedTemplate } from "./seed-marker.js";

export type PlanAuditDimension = "scope_clarity" | "task_breakdown" | "risk_dependency" | "implementation_readiness";

export interface PlanAuditFinding {
  dimension: PlanAuditDimension;
  passed: boolean;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface PlanAuditResult {
  passed: boolean;
  findings: PlanAuditFinding[];
  /** Short summary line for display */
  summary: string;
}

const DIMENSION_LABELS: Record<PlanAuditDimension, string> = {
  scope_clarity: "Scope Clarity",
  task_breakdown: "Task Breakdown",
  risk_dependency: "Risk & Dependency",
  implementation_readiness: "Implementation Readiness",
};

/**
 * Audit a TASK.md plan for quality before allowing dev phase.
 *
 * Checks 4 dimensions:
 *   1. Scope clarity — slices defined, non-goals present
 *   2. Task breakdown — slices are concrete, have IDs and deliverables
 *   3. Risk & dependency — dependencies listed, risks acknowledged
 *   4. Implementation readiness — content is substantive, no template stubs
 */
export function auditTaskPlan(taskMdPath: string): PlanAuditResult {
  const findings: PlanAuditFinding[] = [];
  const log = getLogger();

  if (!fs.existsSync(taskMdPath)) {
    const msg = "TASK.md not found — cannot audit plan";
    log.warn(msg);
    findings.push({
      dimension: "implementation_readiness",
      passed: false,
      severity: "high",
      message: msg,
    });
    return {
      passed: false,
      findings,
      summary: "TASK.md missing — 无法审查",
    };
  }

  const content = fs.readFileSync(taskMdPath, "utf8");
  const lines = content.split("\n");

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    findings.push({
      dimension: "implementation_readiness",
      passed: false,
      severity: "high",
      message: "TASK.md 内容为空",
    });
  }
  if (isSeedTemplate(content)) {
    findings.push({
      dimension: "implementation_readiness",
      passed: false,
      severity: "high",
      message: "仍为引擎模板占位（seed template），未填写实际内容",
    });
  }

  // ── 1. Scope clarity ──
  {
    const dim: PlanAuditDimension = "scope_clarity";
    const dimFindings: string[] = [];

    // Check for slices or task list
    const hasSliceTable = content.includes("| # |") && content.includes("| Slice |");
    const hasTaskList = /[-*]\s+\[.?\]/.test(content);
    const hasNonGoals = /##\s*Non[- ]?goals/i.test(content);
    const hasScopeOut = /##\s*(?:Out of scope|非目标|Scope Out|Non[- ]?goals)/i.test(content);
    const hasBoundary = hasNonGoals || hasScopeOut;

    if (!hasSliceTable && !hasTaskList) {
      dimFindings.push("缺少任务列表（Slice table 或 task list）");
    }
    if (!hasBoundary) {
      dimFindings.push("缺少范围边界说明（Non-goals / Out of scope）");
    }
    if (content.length < 100) {
      dimFindings.push("内容过短，不足以支撑 dev 阶段");
    }

    const passed = dimFindings.length === 0;
    if (!passed) {
      findings.push({
        dimension: dim,
        passed: false,
        severity: dimFindings.length >= 2 ? "high" : "medium",
        message: dimFindings.join("；"),
      });
    } else {
      findings.push({
        dimension: dim,
        passed: true,
        severity: "low",
        message: "范围清晰：有任务拆分 + 边界说明",
      });
    }
  }

  // ── 2. Task breakdown ──
  {
    const dim: PlanAuditDimension = "task_breakdown";
    const dimFindings: string[] = [];

    // Check slice table has concrete deliverables
    const hasDeliverableColumn = /Done|完成|验收|Deliverable|Result/i.test(content);
    const hasConcreteItems = /test|测试|验收|RED\s*(test|GREEN)|vitest|pytest/i.test(content);
    const hasNumberedItems = /^\|?\s*\d+\s*\|/m.test(content);

    if (!hasNumberedItems && !hasConcreteItems) {
      dimFindings.push("任务切片缺少编号或具体可验证产出");
    }
    if (!hasDeliverableColumn) {
      dimFindings.push("切片缺少完成标准列（Done / 验收）");
    }

    const passed = dimFindings.length === 0;
    if (!passed) {
      findings.push({
        dimension: dim,
        passed: false,
        severity: dimFindings.length >= 2 ? "high" : "medium",
        message: dimFindings.join("；"),
      });
    } else {
      findings.push({
        dimension: dim,
        passed: true,
        severity: "low",
        message: "任务拆分具体：有编号 + 可验证产出",
      });
    }
  }

  // ── 3. Risk & Dependency ──
  {
    const dim: PlanAuditDimension = "risk_dependency";
    const dimFindings: string[] = [];

    const hasDependency =
      /##\s*(?:Depend|依赖|Depends|Prerequisite|Dependencies)/i.test(content) ||
      /\|\s*(?:Depends(?:\s+\||\s*$)|依赖|dependencies)\s*\|/i.test(content) ||
      /depends_on|depends on/i.test(content);
    const hasRisk = /##\s*(?:Risk|风险|Risks|Blockers)/i.test(content) || /风险|注意|⚠️|阻塞|edge case/i.test(content);

    if (!hasDependency) {
      dimFindings.push("缺少依赖关系说明");
    }
    if (!hasRisk) {
      dimFindings.push("缺少风险/阻塞项说明");
    }

    const passed = dimFindings.length === 0;
    if (!passed) {
      findings.push({
        dimension: dim,
        passed: false,
        severity: dimFindings.length >= 2 ? "high" : "medium",
        message: dimFindings.join("；"),
      });
    } else {
      findings.push({
        dimension: dim,
        passed: true,
        severity: "low",
        message: "有依赖 + 风险说明",
      });
    }
  }

  // ── 4. Implementation Readiness ──
  {
    const dim: PlanAuditDimension = "implementation_readiness";
    const dimFindings: string[] = [];

    // Check for template placeholder patterns
    const hasPlaceholder = /\[TODO:|\bTODO\b|\[待实现\]|\[待补充\]|\[Minimal\s/i.test(content);
    // Check for sufficient depth
    const lineCount = lines.length;

    if (hasPlaceholder) {
      dimFindings.push("含占位符残留（TODO / [待实现] / [待补充]）");
    }
    if (lineCount < 10) {
      dimFindings.push("TASK.md 不足 10 行，内容不充分");
    }

    const passed = dimFindings.length === 0;
    if (!passed) {
      const hasSeed = findings.some((f) => f.dimension === "implementation_readiness" && !f.passed);
      // If seed is already a finding, skip duplicate high
      if (!hasSeed || !dimFindings.every((f) => f.includes("占位符"))) {
        findings.push({
          dimension: dim,
          passed: false,
          severity: dimFindings.length >= 2 ? "high" : "medium",
          message: dimFindings.join("；"),
        });
      }
    } else {
      findings.push({
        dimension: dim,
        passed: true,
        severity: "low",
        message: "内容充实，无残留占位符",
      });
    }
  }

  // ── Aggregate ──
  const high = findings.filter((f) => !f.passed && f.severity === "high");
  const medium = findings.filter((f) => !f.passed && f.severity === "medium");
  const passed = high.length === 0 && medium.length <= 1;

  const summaryParts: string[] = [];
  if (high.length > 0) summaryParts.push(`${high.length} high`);
  if (medium.length > 0) summaryParts.push(`${medium.length} medium`);
  const summary =
    summaryParts.length > 0
      ? `Plan 审查: ${summaryParts.join(", ")} 问题 — ${passed ? "可通过" : "需修改后重审"}`
      : "Plan 审查: 全部通过 ✓";

  log.info("[plan-audit] TASK.md audit result", {
    passed,
    high: high.length,
    medium: medium.length,
    findings: findings.filter((f) => !f.passed).map((f) => f.message),
  });

  return { passed, findings, summary };
}

/** Format audit findings into a readable string (for CLI/error output). */
export function formatPlanAudit(result: PlanAuditResult): string {
  const lines: string[] = ["═══ Plan 质量审查 ═══"];
  for (const f of result.findings) {
    const icon = f.passed ? "✓" : "✗";
    const label = DIMENSION_LABELS[f.dimension] ?? f.dimension;
    lines.push(`  ${icon} [${f.severity}] ${label}: ${f.message}`);
  }
  lines.push(`─── ${result.passed ? "✓ 通过" : "✗ 未通过"} ───`);
  return lines.join("\n");
}
