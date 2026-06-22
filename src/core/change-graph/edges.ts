/**
 * edges.ts — 跨阶段边目录、buildEdges、SSOT违规检测。
 */
import type { PhaseId } from "../types.js";
import type { Edge, EdgeRule, GraphNode, NodeKind, SSOTViolation, MatchStrategy } from "./types.js";

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

/** Build edges between nodes based on EDGE_CATALOG rules.
 *  Uses positional pairing: sources & targets are sorted by ID (which encodes index),
 *  then zip-matched at same positions. Falls back to all-to-all when sizes differ. */
export function buildEdges(
  nodes: Map<string, GraphNode>,
  edges: Map<string, Edge[]>,
): void {
  const nodeArr = [...nodes.values()];

  for (const rule of EDGE_CATALOG) {
    const sources = nodeArr
      .filter((n) => rule.fromPhases.includes(n.phase) && n.kind === rule.fromKind)
      .sort((a, b) => a.id.localeCompare(b.id));
    const targets = nodeArr
      .filter((n) => rule.toPhases.includes(n.phase) && n.kind === rule.toKind)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (sources.length === 0 || targets.length === 0) continue;

    if (rule.edgeKind === "duplicates") {
      // Duplicate detection: link ALL pairs (we want to detect all possible mismatches)
      for (const src of sources) {
        for (const tgt of targets) {
          addEdgeIfNew(edges, src.id, tgt.id, rule.edgeKind);
        }
      }
    } else {
      // Positional pairing: zip-match at same index
      const maxLen = Math.max(sources.length, targets.length);
      for (let i = 0; i < maxLen; i++) {
        const src = sources[i % sources.length];
        const tgt = targets[i % targets.length];
        addEdgeIfNew(edges, src.id, tgt.id, rule.edgeKind);
      }
    }
  }
}

function addEdgeIfNew(edges: Map<string, Edge[]>, from: string, to: string, kind: Edge["kind"]): void {
  const existing = edges.get(from) ?? [];
  if (!existing.some((e) => e.to === to && e.kind === kind)) {
    existing.push({ from, to, kind });
    edges.set(from, existing);
  }
}

/**
 * Detect SSOT violations using EDGE_CATALOG rules.
 * Only checks edges from rules with violationEnabled:true.
 * matchStrategy controls comparison strictness per rule.
 */
export function detectSSOTViolations(
  nodes: Map<string, GraphNode>,
  _edges: Map<string, Edge[]>,
): SSOTViolation[] {
  const violations: SSOTViolation[] = [];

  const violationRules = EDGE_CATALOG.filter((r) => r.violationEnabled === true);
  if (violationRules.length === 0) return violations;

  const severityMap: Record<string, SSOTViolation["severity"]> = {
    rollback: "high", threat: "high", nfr: "high",
    risk: "medium", deployment_step: "medium", monitoring_metric: "medium",
    design_decision: "low",
  };

  for (const rule of violationRules) {
    const sources = [...nodes.values()]
      .filter((n) => rule.fromPhases.includes(n.phase) && n.kind === rule.fromKind)
      .sort((a, b) => a.id.localeCompare(b.id));
    const targets = [...nodes.values()]
      .filter((n) => rule.toPhases.includes(n.phase) && n.kind === rule.toKind)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (sources.length === 0 || targets.length === 0) continue;

    const strategy: MatchStrategy = rule.matchStrategy ?? "substring";
    const minLen = Math.min(sources.length, targets.length);

    for (let i = 0; i < minLen; i++) {
      const src = sources[i];
      const tgt = targets[i];
      if (!labelsDiffer(src.label, tgt.label, strategy)) continue;

      violations.push({
        field: `${rule.fromKind} (${String(src.phase)} vs ${String(tgt.phase)})`,
        nodes: [src, tgt],
        description: `${kindDescr(rule.fromKind)}跨阶段不一致: "${truncLabel(src.label)}" ≠ "${truncLabel(tgt.label)}"`,
        severity: severityMap[rule.fromKind] ?? "low",
      });
    }
  }

  return violations;
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
