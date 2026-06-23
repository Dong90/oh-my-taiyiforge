/**
 * query.ts — 图查询：getCrossCutting、validateConsistency、traverseEdges。
 */
import type { Subgraph, SSOTViolation, ConsistencyReport, GraphNode, Edge, NodeKind } from "./types.js";

const DOMAIN_KINDS: Record<string, NodeKind[]> = {
  security: ["risk", "nfr", "threat", "test_case"],
  rollback: ["rollback", "deployment_step"],
  performance: ["nfr"],
  deployment: ["deployment_step", "rollback", "monitoring_metric"],
  quality: ["acceptance_criterion", "test_case", "design_decision"],
};

/** Filter subgraph by domain: all nodes of relevant kinds + their interconnecting edges. */
export function getCrossCutting(
  domain: string,
  nodes: Map<string, GraphNode>,
  edges: Map<string, Edge[]>,
): Subgraph {
  const kinds = DOMAIN_KINDS[domain];
  if (!kinds) return { nodes: [], edges: [] };

  const matched = new Set<string>();
  const resultNodes: GraphNode[] = [];

  for (const node of nodes.values()) {
    if (kinds.includes(node.kind)) {
      matched.add(node.id);
      resultNodes.push(node);
    }
  }

  const resultEdges: Edge[] = [];
  for (const [fromId, edgeList] of edges) {
    if (!matched.has(fromId)) continue;
    for (const e of edgeList) {
      if (matched.has(e.to)) resultEdges.push(e);
    }
  }

  return { nodes: resultNodes, edges: resultEdges };
}

/** Validate consistency: produce report from violations + stats. */
export function validateConsistency(
  violations: SSOTViolation[],
  nodeCount: number,
  edgeCount: number,
): ConsistencyReport {
  if (violations.length === 0) {
    return { ok: true, violations: [], summary: `无 SSOT 冲突 (${nodeCount} 节点, ${edgeCount} 边)` };
  }

  const highCount = violations.filter((v) => v.severity === "high").length;
  const parts = [`检测到 ${violations.length} 个 SSOT 冲突`];
  if (highCount > 0) parts.push(`${highCount} 个 high severity`);
  if (violations.length > 3) parts.push("建议优先修复 high severity 项");

  return { ok: false, violations, summary: parts.join("，") };
}

/**
 * BFS traverse from startIds following edges up to maxDepth.
 * Returns all reachable nodes + traversed edges.
 */
export function traverseEdges(
  startIds: string[],
  nodes: Map<string, GraphNode>,
  edges: Map<string, Edge[]>,
  maxDepth = 3,
): Subgraph {
  const visited = new Set<string>();
  const resultEdges: Edge[] = [];
  let frontier = new Set(startIds.filter((id) => nodes.has(id)));
  for (const id of frontier) visited.add(id);

  for (let depth = 0; depth < maxDepth && frontier.size > 0; depth++) {
    const next = new Set<string>();
    for (const fromId of frontier) {
      const edgeList = edges.get(fromId) ?? [];
      for (const e of edgeList) {
        if (!visited.has(e.to)) {
          visited.add(e.to);
          next.add(e.to);
          resultEdges.push(e);
        }
      }
    }
    frontier = next;
  }

  const resultNodes: GraphNode[] = [];
  for (const id of visited) {
    const node = nodes.get(id);
    if (node) resultNodes.push(node);
  }

  return { nodes: resultNodes, edges: resultEdges };
}
