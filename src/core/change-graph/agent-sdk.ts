import fs from "node:fs";
import path from "node:path";
import type { PhaseId } from "../types.js";
import {
  ChangeGraph,
  type Subgraph,
  type SSOTViolation,
} from "./index.js";

/**
 * Agent SDK — graph-native context API for AI agents.
 * Agents read structured graph data instead of grep-based Markdown parsing.
 *
 * Usage:
 *   const sdk = AgentContext.fromChangeDir(changeDir, slug);
 *   console.log(sdk.getSecurityAudit());
 *   sdk.writePhaseContext(); // replaces PHASE-CONTEXT.md
 */
export class AgentContext {
  private constructor(
    private graph: ChangeGraph,
    private changeDir: string,
  ) {}

  /* ──── Factory methods ──── */

  /** Load from a change directory: loads all phase JSONs into a ChangeGraph, builds edges, detects violations. */
  static fromChangeDir(changeDir: string, slug: string): AgentContext {
    const graph = new ChangeGraph();
    graph.setSlug(slug);
    graph.load(changeDir);
    graph.buildEdges();
    graph.findSSOTViolations();
    return new AgentContext(graph, changeDir);
  }

  /** Load from E2E-style fixtures (for testing). */
  static fromFixtures(fixtures: Record<string, object>, slug: string): AgentContext {
    const graph = ChangeGraph.fromFixtures(fixtures, slug);
    graph.buildEdges();
    graph.findSSOTViolations();
    return new AgentContext(graph, "");
  }

  /** Reload all phase JSONs from disk and rebuild the graph. */
  refresh(): void {
    this.graph = new ChangeGraph();
    this.graph.load(this.changeDir);
    this.graph.buildEdges();
    this.graph.findSSOTViolations();
  }

  /* ──── Agent-readable reports ──── */

  /** Full agent context (replaces PHASE-CONTEXT.md). */
  getFullContext(): string {
    return this.graph.renderAgentContext();
  }

  /** Security audit: risks → NFRs → threats → tests. */
  getSecurityAudit(): string {
    const sub = this.graph.getCrossCutting("security");
    if (sub.nodes.length === 0) return "No security-related nodes found.";

    const lines: string[] = ["# Security Audit", ""];
    for (const node of sub.nodes) {
      const edges = sub.edges.filter((e) => e.from === node.id || e.to === node.id);
      lines.push(`- **${node.kind}** [${node.phase}] ${node.label}`);
      if (edges.length > 0) {
        for (const e of edges) {
          const target = sub.nodes.find((n) => n.id === e.to);
          if (target) lines.push(`  → ${e.kind} → **${target.kind}** ${target.label}`);
        }
      }
    }
    lines.push("");
    lines.push(`Total: ${sub.nodes.length} nodes, ${sub.edges.length} edges`);
    return lines.join("\n");
  }

  /** Rollback plan: unified view from all phases. */
  getRollbackPlan(): string {
    const sub = this.graph.getCrossCutting("rollback");
    if (sub.nodes.length === 0) return "No rollback nodes found.";

    const lines: string[] = ["# Rollback Plan", ""];
    for (const node of sub.nodes) {
      lines.push(`- [${node.phase}] **${node.kind}**: ${node.label}`);
    }
    return lines.join("\n");
  }

  /** SSOT violations report. */
  getSSOTReport(): string {
    const violations = this.graph.findSSOTViolations();
    if (violations.length === 0) return "No SSOT violations detected.";

    const lines: string[] = ["# SSOT Violations", ""];
    for (const v of violations) {
      lines.push(`- [${v.severity.toUpperCase()}] ${v.field}: ${v.description}`);
    }
    lines.push("");
    lines.push(`${violations.length} violations total`);
    return lines.join("\n");
  }

  /** Phase summary: extracted key info for a single phase. */
  getPhaseSummary(phase: PhaseId): string {
    return this.graph.renderPhaseSummary(phase);
  }

  /** Quick checklist for the current phase (what's done, what's next). */
  getPhaseChecklist(phase: PhaseId): string {
    const nodes = this.graph.nodesByPhase(phase);
    const lines: string[] = [`# ${phase.toUpperCase()} Checklist`, ""];
    const kinds = new Map<string, number>();
    for (const n of nodes) {
      kinds.set(n.kind, (kinds.get(n.kind) ?? 0) + 1);
    }
    for (const [kind, count] of kinds) {
      lines.push(`- [ ] **${kind}** (${count} items)`);
    }
    if (nodes.length === 0) {
      lines.push("_(no data loaded yet)_");
    }
    return lines.join("\n");
  }

  /* ──── I/O ──── */

  /** Write the graph-generated context to PHASE-CONTEXT.md. */
  writePhaseContext(): void {
    const ctxPath = path.join(this.changeDir, "PHASE-CONTEXT.md");
    const content = this.getFullContext();
    fs.writeFileSync(ctxPath, content + "\n", "utf8");
  }

  /** Write a specific report to a file. */
  writeReport(name: string, content: string): void {
    const reportPath = path.join(this.changeDir, name);
    fs.writeFileSync(reportPath, content + "\n", "utf8");
  }

  /** Underlying graph for advanced queries. */
  getGraph(): ChangeGraph {
    return this.graph;
  }
}
