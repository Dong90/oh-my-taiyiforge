import fs from "node:fs";
import { getLogger } from "./logger.js";
import { isSeedTemplate } from "./seed-marker.js";

export type DesignApproachDimension =
  | "alternatives"
  | "reuse_analysis"
  | "decision_rationale"
  | "risk_tradeoff";

export interface DesignApproachFinding {
  dimension: DesignApproachDimension;
  passed: boolean;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface DesignApproachResult {
  passed: boolean;
  findings: DesignApproachFinding[];
  /** Short summary line for display */
  summary: string;
}

const DIMENSION_LABELS: Record<DesignApproachDimension, string> = {
  alternatives: "Alternatives (多方案对比)",
  reuse_analysis: "Reuse Analysis (复用分析)",
  decision_rationale: "Decision Rationale (决策依据)",
  risk_tradeoff: "Risk Tradeoff (风险权衡)",
};

/**
 * Audit a DESIGN.md for approach optimality before allowing task phase.
 *
 * Checks 4 dimensions:
 *   1. Alternatives — Options table has ≥2 entries (A/B comparison)
 *   2. Reuse analysis — checks if existing code/modules were considered
 *   3. Decision rationale — Chosen option has substantive reasoning
 *   4. Risk tradeoff — risks/mitigations correspond to the chosen approach
 */
export function auditDesignApproach(designMdPath: string): DesignApproachResult {
  const findings: DesignApproachFinding[] = [];
  const log = getLogger();

  if (!fs.existsSync(designMdPath)) {
    const msg = "DESIGN.md not found — cannot audit design approach";
    log.warn(msg);
    findings.push({
      dimension: "decision_rationale",
      passed: false,
      severity: "high",
      message: msg,
    });
    return {
      passed: false,
      findings,
      summary: "DESIGN.md missing — 无法审查",
    };
  }

  const content = fs.readFileSync(designMdPath, "utf8");

  const trimmed = content.trim();
  if (!trimmed) {
    findings.push({
      dimension: "decision_rationale",
      passed: false,
      severity: "high",
      message: "DESIGN.md 内容为空",
    });
  }
  if (isSeedTemplate(content)) {
    findings.push({
      dimension: "decision_rationale",
      passed: false,
      severity: "high",
      message: "仍为引擎模板占位（seed template），未填写实际内容",
    });
  }

  // ── 1. Alternatives — ≥2 options ──
  {
    const dim: DesignApproachDimension = "alternatives";
    const hasOptionA = /^\|?\s*A\s*\|/m.test(content);
    const hasOptionB = /^\|?\s*B\s*\|/m.test(content);
    const hasMultipleOptions = hasOptionA && hasOptionB;

    if (!hasMultipleOptions) {
      findings.push({
        dimension: dim,
        passed: false,
        severity: "high",
        message: "Options 表缺少 ≥2 个方案（选项 A/B），无法证明多方案对比",
      });
    } else {
      const optionARow = content.split("\n").find((l) => /^\|?\s*A\s*\|/.test(l));
      const optionBRow = content.split("\n").find((l) => /^\|?\s*B\s*\|/.test(l));
      const aFilled = optionARow && optionARow.split("|").length >= 4;
      const bFilled = optionBRow && optionBRow.split("|").length >= 4;

      if (!aFilled || !bFilled) {
        findings.push({
          dimension: dim,
          passed: false,
          severity: "medium",
          message: "Options 行缺少实质性描述（Summary / Pros / Cons 未填写）",
        });
      } else {
        findings.push({
          dimension: dim,
          passed: true,
          severity: "low",
          message: "有 ≥2 个方案对比且内容充实",
        });
      }
    }
  }

  // ── 2. Reuse Analysis — has ## Reuse Analysis section ──
  {
    const dim: DesignApproachDimension = "reuse_analysis";
    const hasReuseSection = /^#{2,3}\s*Reuse Analysis/im.test(content);
    const hasReuseCn = /^#{2,3}\s*复用分析/im.test(content);
    const hasReuseKeywords =
      /\b(reuse|复用|existing|已有|可复用|could\s+use|already\s+have|现有的)\b/i.test(content);

    if (!hasReuseSection && !hasReuseCn) {
      if (!hasReuseKeywords) {
        findings.push({
          dimension: dim,
          passed: false,
          severity: "high",
          message: "未检查已有代码/模块复用（缺少 ## Reuse Analysis 节或复用关键词）",
        });
      } else {
        findings.push({
          dimension: dim,
          passed: false,
          severity: "medium",
          message: "提及复用但缺少 ## Reuse Analysis 专节，建议显式声明",
        });
      }
    } else {
      findings.push({
        dimension: dim,
        passed: true,
        severity: "low",
        message: "有复用分析：检查了已有代码/模块",
      });
    }
  }

  // ── 3. Decision Rationale — Reason is substantive ──
  {
    const dim: DesignApproachDimension = "decision_rationale";
    const dimFindings: string[] = [];

    const hasChosenLine = /^\*\*Chosen:\*\*/m.test(content);
    const hasChosenCn = /^\*\*选定的方案：\*\*/m.test(content);
    const hasReasonLine = /^\*\*Reason:\*\*/m.test(content);
    const hasReasonCn = /^\*\*理由：\*\*/m.test(content);
    const hasSubstantiveReason =
      /\b(reason|因为|性能|成本|复杂度|安全|可维护|兼容|scalab|cost|perform|trade.?off|权衡|latency|吞吐)\b/i.test(
        content,
      );

    if (!hasChosenLine && !hasChosenCn) {
      dimFindings.push("缺少 **Chosen:** 决策行");
    }
    if ((!hasReasonLine && !hasReasonCn) || !hasSubstantiveReason) {
      dimFindings.push("决策（Reason）缺少实质性理由（性能/成本/复杂度等权衡）");
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
        message: "决策有明确理由（含实质性权衡）",
      });
    }
  }

  // ── 4. Risk Tradeoff — risks correspond to chosen option ──
  {
    const dim: DesignApproachDimension = "risk_tradeoff";
    const dimFindings: string[] = [];

    const hasRiskTableHeader =
      /^\|?\s*Risk\s*\|/.test(content) || /^\|?\s*风险\s*\|/.test(content);
    const hasRiskContent = /\b[Rr]isk\b|风险|Mitigation|缓解|trade.?off|权衡/i.test(content);

    if (!hasRiskTableHeader && !hasRiskContent) {
      dimFindings.push("缺少 Risks 表，未评估所选方案的风险");
    }

    if (hasRiskTableHeader) {
      const rows = content
        .split("\n")
        .filter(
          (line) =>
            /^\|/.test(line) &&
            !/^\|?\s*Risk\s*\|/.test(line) &&
            !/^\|?\s*风险\s*\|/.test(line) &&
            !/^\|?\s*-{3,}\s*\|/.test(line),
        );
      if (rows.length < 2) {
        dimFindings.push("Risks 表有表头但缺少实际内容行");
      }
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
        message: "风险权衡充分：有风险缓解方案",
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
      ? `Design approach 审查: ${summaryParts.join(", ")} 问题 — ${passed ? "可通过" : "需修改后重审"}`
      : "Design approach 审查: 全部通过 ✓";

  log.info("[design-approach-check] DESIGN.md audit result", {
    passed,
    high: high.length,
    medium: medium.length,
    findings: findings.filter((f) => !f.passed).map((f) => f.message),
  });

  return { passed, findings, summary };
}

/** Format design approach audit findings into a readable string (for CLI/error output). */
export function formatDesignApproachAudit(result: DesignApproachResult): string {
  const lines: string[] = ["═══ Design 方案质量审查 ═══"];
  for (const f of result.findings) {
    const icon = f.passed ? "✓" : "✗";
    const label = DIMENSION_LABELS[f.dimension] ?? f.dimension;
    lines.push(`  ${icon} [${f.severity}] ${label}: ${f.message}`);
  }
  lines.push(`─── ${result.passed ? "✓ 通过" : "✗ 未通过"} ───`);
  return lines.join("\n");
}
