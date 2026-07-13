/**
 * edges.ts — 跨阶段边目录、buildEdges、SSOT违规检测。
 *
 * @deprecated 整个文件保留为 "legacy" 入口；真源已迁至：
 *   - EDGE_CATALOG  → src/core/builtin-ssot-rules.ts (BUILTIN_SSOT_RULES)
 *   - buildEdges / detectSSOTViolations → 委托到 SSOTRuleRegistry
 *   任何 registerSSOTRule 加的规则会立即生效。
 *   本文件保留只为向后兼容，新代码请直接用 registry。
 */
import type { PhaseId } from "../types.js";
import type { Edge, EdgeRule, GraphNode, NodeKind, SSOTViolation, MatchStrategy } from "./types.js";
import { getDefaultSSOTRuleRegistry } from "../ssot-rule-registry.js";
import {
  buildEdgesWithRegistry,
  detectSSOTViolationsWithRegistry,
} from "../ssot-rule-registry.js";

export const EDGE_CATALOG: EdgeRule[] = [
  { fromPhases: ["change"], fromKind: "risk", toPhases: ["requirement"], toKind: "nfr", edgeKind: "derives_from", violationEnabled: true },
  { fromPhases: ["requirement"], fromKind: "nfr", toPhases: ["design"], toKind: "threat", edgeKind: "derives_from", violationEnabled: true },
  { fromPhases: ["design"], fromKind: "threat", toPhases: ["test"], toKind: "test_case", edgeKind: "tests" },
  { fromPhases: ["design"], fromKind: "threat", toPhases: ["review"], toKind: "test_case", edgeKind: "tests" },
  { fromPhases: ["requirement"], fromKind: "acceptance_criterion", toPhases: ["test"], toKind: "test_case", edgeKind: "tests" },
  { fromPhases: ["design"], fromKind: "design_decision", toPhases: ["task"], toKind: "slice", edgeKind: "implements", violationEnabled: true, matchStrategy: "exact" },
  { fromPhases: ["design"], fromKind: "deployment_step", toPhases: ["integration"], toKind: "monitoring_metric", edgeKind: "monitors" },
  { fromPhases: ["task"], fromKind: "risk", toPhases: ["design"], toKind: "risk", edgeKind: "derives_from", violationEnabled: true, matchStrategy: "word-overlap-2" },
  { fromPhases: ["task"], fromKind: "rollback", toPhases: ["design"], toKind: "rollback", edgeKind: "rolls_back", violationEnabled: true },
  { fromPhases: ["change"], fromKind: "rollback", toPhases: ["design"], toKind: "rollback", edgeKind: "duplicates", violationEnabled: true },
  { fromPhases: ["design"], fromKind: "rollback", toPhases: ["integration"], toKind: "rollback", edgeKind: "rolls_back", violationEnabled: true },
  { fromPhases: ["test"], fromKind: "test_case", toPhases: ["review"], toKind: "test_case", edgeKind: "tests" },
];

/** Build edges via the default SSOTRuleRegistry (which loads BUILTIN_SSOT_RULES
 *  on first access — same set as the legacy EDGE_CATALOG above).
 *  Backward compatible: existing callers see identical behavior. */
export function buildEdges(
  nodes: Map<string, GraphNode>,
  edges: Map<string, Edge[]>,
): void {
  buildEdgesWithRegistry(nodes, edges, getDefaultSSOTRuleRegistry());
}

function addEdgeIfNew(edges: Map<string, Edge[]>, from: string, to: string, kind: Edge["kind"]): void {
  const existing = edges.get(from) ?? [];
  if (!existing.some((e) => e.to === to && e.kind === kind)) {
    existing.push({ from, to, kind });
    edges.set(from, existing);
  }
}

/**
 * Detect SSOT violations via the default SSOTRuleRegistry.
 * Backward compatible: existing callers see identical violations.
 */
export function detectSSOTViolations(
  nodes: Map<string, GraphNode>,
  _edges: Map<string, Edge[]>,
): SSOTViolation[] {
  return detectSSOTViolationsWithRegistry(nodes, getDefaultSSOTRuleRegistry());
}

/** Labels differ per strategy. */
function labelsDiffer(a: string, b: string, strategy: MatchStrategy): boolean {
  if (a === b) return false;
  if (strategy === "exact") return true;

  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return false;

  if (strategy === "substring") {
    return !(na.includes(nb) || nb.includes(na));
  }

  const wa = new Set(na.split(/\s+/).filter((w) => w.length > 1));
  const wb = new Set(nb.split(/\s+/).filter((w) => w.length > 1));
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  const threshold = strategy === "word-overlap-2" ? 2 : 1;
  return common < threshold;
}

function kindDescr(kind: string): string {
  const map: Record<string, string> = {
    rollback: "回滚策略",
    threat: "安全威胁",
    nfr: "非功能需求",
    risk: "风险评估",
    deployment_step: "部署步骤",
    monitoring_metric: "监控指标",
    acceptance_criterion: "验收标准",
    design_decision: "设计决策",
    test_case: "测试用例",
    slice: "任务切片",
  };
  return map[kind] ?? kind;
}

function truncLabel(s: string, max = 40): string {
  return s.length <= max ? s : s.slice(0, max - 3) + "...";
}

/** Convenience: run buildEdges + detectSSOTViolations. */
export function buildAndValidate(
  nodes: Map<string, GraphNode>,
  edges: Map<string, Edge[]>,
): SSOTViolation[] {
  buildEdges(nodes, edges);
  return detectSSOTViolations(nodes, edges);
}
