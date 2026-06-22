import type { PhaseId } from "../types.js";
import type {
  GraphNode,
  Edge,
  EdgeKind,
  NodeKind,
  Subgraph,
  SSOTViolation,
  ConsistencyReport,
  GraphSnapshot,
} from "./types.js";
import {
  loadPhaseJsons,
  extractNodesFromPhase,
} from "./loader.js";
import { buildEdges, detectSSOTViolations } from "./edges.js";
import { getCrossCutting, validateConsistency } from "./query.js";
import {
  renderAgentContext,
  renderPhaseSummary,
  toSnapshot,
  fromSnapshot,
} from "./render.js";

export type {
  GraphNode,
  Edge,
  EdgeKind,
  NodeKind,
  Subgraph,
  SSOTViolation,
  ConsistencyReport,
  GraphSnapshot,
};

export { EDGE_CATALOG } from "./edges.js";

/**
 * ChangeGraph — 聚合所有 phase JSON 到统一的图结构中。
 *
 * Usage:
 *   const graph = new ChangeGraph();
 *   graph.load(changeDir);
 *   graph.buildEdges();
 *   const ctx = graph.renderAgentContext();
 */
export class ChangeGraph {
  nodes = new Map<string, GraphNode>();
  edges = new Map<string, Edge[]>();
  private _violations: SSOTViolation[] = [];
  private _slug = "";

  /* ──── Loading ──── */

  /** Load all phase JSON files from a change directory. */
  load(changeDir: string): { ok: boolean; error?: string } {
    try {
      const phaseData = loadPhaseJsons(changeDir);
      if (phaseData.size === 0) {
        return { ok: false, error: `No phase JSON files found in ${changeDir}` };
      }
      for (const [phase, data] of phaseData) {
        const phaseNodes = extractNodesFromPhase(phase, data);
        for (const node of phaseNodes) {
          this.nodes.set(node.id, node);
        }
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** Load from E2E-style fixtures (Record<phaseId, jsonData>). */
  static fromFixtures(fixtures: Record<string, object>, slug?: string): ChangeGraph {
    const graph = new ChangeGraph();
    if (slug) graph._slug = slug;
    for (const [phaseId, data] of Object.entries(fixtures)) {
      const phaseNodes = extractNodesFromPhase(phaseId as PhaseId, data as Record<string, unknown>);
      for (const node of phaseNodes) {
        graph.nodes.set(node.id, node);
      }
    }
    return graph;
  }

  /* ──── Node / Edge management ──── */

  addNode(
    phase: PhaseId,
    kind: NodeKind,
    id: string,
    label: string,
    data: Record<string, unknown>,
  ): void {
    this.nodes.set(id, { id, phase, kind, label, data });
  }

  addEdge(from: string, to: string, kind: EdgeKind): void {
    const edge: Edge = { from, to, kind };
    const existing = this.edges.get(from) ?? [];
    // Deduplicate: same from+to+kind
    if (!existing.some((e) => e.to === to && e.kind === kind)) {
      existing.push(edge);
    }
    this.edges.set(from, existing);
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdges(id: string): Edge[] {
    return this.edges.get(id) ?? [];
  }

  nodesByKind(kind: NodeKind): GraphNode[] {
    return [...this.nodes.values()].filter((n) => n.kind === kind);
  }

  nodesByPhase(phase: PhaseId): GraphNode[] {
    return [...this.nodes.values()].filter((n) => n.phase === phase);
  }

  get nodeCount(): number {
    return this.nodes.size;
  }

  get edgeCount(): number {
    let count = 0;
    for (const edgeList of this.edges.values()) {
      count += edgeList.length;
    }
    return count;
  }

  /* ──── Edge building ──── */

  buildEdges(): void {
    buildEdges(this.nodes, this.edges);
  }

  /* ──── Query ──── */

  getCrossCutting(domain: string): Subgraph {
    return getCrossCutting(domain, this.nodes, this.edges);
  }

  findSSOTViolations(): SSOTViolation[] {
    this._violations = detectSSOTViolations(this.nodes, this.edges);
    return this._violations;
  }

  validateConsistency(): ConsistencyReport {
    // Always recompute — nodes may have changed since last findSSOTViolations
    const violations = detectSSOTViolations(this.nodes, this.edges);
    return validateConsistency(violations, this.nodeCount, this.edgeCount);
  }

  /* ──── Render ──── */

  /** Agent-readable structured context (supersedes PHASE-CONTEXT.md). */
  renderAgentContext(slug?: string): string {
    return renderAgentContext(this.nodes, this.edges, this._violations, slug ?? this._slug);
  }

  /** Summary of a single phase. */
  renderPhaseSummary(phase: PhaseId): string {
    return renderPhaseSummary(phase, this.nodes);
  }

  /** Set the slug for context rendering. */
  setSlug(slug: string): void {
    this._slug = slug;
  }

  /* ──── Serialization ──── */

  toJSON(): GraphSnapshot {
    return toSnapshot(this.nodes, this.edges);
  }

  toSnapshot(): GraphSnapshot {
    return this.toJSON();
  }

  static fromJSON(snapshot: GraphSnapshot): ChangeGraph {
    return ChangeGraph.fromSnapshot(snapshot);
  }

  static fromSnapshot(snapshot: GraphSnapshot): ChangeGraph {
    const { nodes, edges } = fromSnapshot(snapshot);
    const graph = new ChangeGraph();
    graph.nodes = nodes;
    graph.edges = edges;
    return graph;
  }
}
