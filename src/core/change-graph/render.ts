/**
 * render.ts — Graph → Agent-readable context + serialization.
 */
import type { PhaseId } from "../types.js";
import type { GraphNode, Edge, GraphSnapshot, SSOTViolation } from "./types.js";

/** Render an agent-readable context from the graph. */
export function renderAgentContext(
  nodes: Map<string, GraphNode>,
  edges: Map<string, Edge[]>,
  violations: SSOTViolation[],
  slug: string,
): string {
  const lines: string[] = [];
  lines.push(`# Change Graph: ${slug}`);
  lines.push("");

  // Phase summaries
  const phases: PhaseId[] = ["change", "requirement", "design", "ui-design", "task", "test", "review", "integration"];
  const nodesByPhase = new Map<PhaseId, GraphNode[]>();
  for (const node of nodes.values()) {
    if (!nodesByPhase.has(node.phase)) nodesByPhase.set(node.phase, []);
    nodesByPhase.get(node.phase)!.push(node);
  }

  lines.push("## Phases");
  for (const phase of phases) {
    const phaseNodes = nodesByPhase.get(phase) ?? [];
    if (phaseNodes.length === 0) continue;
    lines.push(`### ${phase} (${phaseNodes.length} nodes)`);
    const summary = renderPhaseSummary(phase, nodes);
    if (summary) lines.push(summary);
    lines.push("");
  }

  // Cross-cutting concerns
  if (violations.length > 0) {
    lines.push("## Cross-Cutting Concerns");
    const bySeverity = { high: 0, medium: 0, low: 0 };
    for (const v of violations) bySeverity[v.severity]++;
    lines.push(`**${violations.length}** SSOT violations: ${bySeverity.high} high, ${bySeverity.medium} medium, ${bySeverity.low} low`);
    for (const v of violations) {
      lines.push(`- [${v.severity.toUpperCase()}] ${v.field}: ${v.description}`);
    }
    lines.push("");
  }

  // Stats
  let edgeTotal = 0;
  for (const el of edges.values()) edgeTotal += el.length;
  lines.push("## Stats");
  lines.push(`- Total nodes: ${nodes.size}`);
  lines.push(`- Total edges: ${edgeTotal}`);
  lines.push(`- Phases with nodes: ${nodesByPhase.size}/${phases.length}`);
  lines.push("");

  return lines.join("\n");
}

/** Render a summary of a single phase's nodes. */
export function renderPhaseSummary(
  phase: PhaseId,
  nodes: Map<string, GraphNode>,
): string {
  const phaseNodes = [...nodes.values()].filter((n) => n.phase === phase);
  if (phaseNodes.length === 0) return "";

  const kinds = new Map<string, GraphNode[]>();
  for (const n of phaseNodes) {
    if (!kinds.has(n.kind)) kinds.set(n.kind, []);
    kinds.get(n.kind)!.push(n);
  }

  const lines: string[] = [];
  for (const [kind, nodeList] of kinds) {
    if (nodeList.length <= 3) {
      const labels = nodeList.map((n) => truncate(n.label, 60)).join(" / ");
      lines.push(`**${kind}** (${nodeList.length}) ${labels}`);
    } else {
      lines.push(`**${kind}** (${nodeList.length})`);
      for (let i = 0; i < Math.min(3, nodeList.length); i++) {
        lines.push(`  - ${truncate(nodeList[i].label, 60)}`);
      }
      lines.push(`  - ... +${nodeList.length - 3} more`);
    }
  }
  return lines.join("\n");
}

function truncate(s: string, max: number): string {
  if (!s) return "(empty)";
  return s.length <= max ? s : s.slice(0, max - 3) + "...";
}

/** Serialize graph to lightweight JSON snapshot. */
export function toSnapshot(
  nodes: Map<string, GraphNode>,
  edges: Map<string, Edge[]>,
): GraphSnapshot {
  const nodeArr = [...nodes.values()].map((n) => ({
    id: n.id,
    phase: n.phase,
    kind: n.kind,
    label: n.label,
  }));
  const edgeArr: GraphSnapshot["edges"] = [];
  for (const [from, edgeList] of edges) {
    for (const e of edgeList) {
      edgeArr.push({ from: e.from, to: e.to, kind: e.kind });
    }
  }
  return { nodes: nodeArr, edges: edgeArr };
}

/** Deserialize from snapshot to nodes+edges maps. */
export function fromSnapshot(
  snapshot: GraphSnapshot,
): { nodes: Map<string, GraphNode>; edges: Map<string, Edge[]> } {
  const nodes = new Map<string, GraphNode>();
  for (const n of snapshot.nodes) {
    nodes.set(n.id, { id: n.id, phase: n.phase, kind: n.kind, label: n.label, data: {} });
  }
  const edges = new Map<string, Edge[]>();
  for (const e of snapshot.edges) {
    const list = edges.get(e.from) ?? [];
    list.push({ from: e.from, to: e.to, kind: e.kind });
    edges.set(e.from, list);
  }
  return { nodes, edges };
}
