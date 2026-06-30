import { describe, expect, it, beforeEach } from "vitest";
import { ChangeGraph } from "../src/core/change-graph/index.js";
import { EDGE_CATALOG } from "../src/core/change-graph/index.js";
import { buildEdges as legacyBuildEdges, detectSSOTViolations as legacyDetectSSOT } from "../src/core/change-graph/edges.js";
import {
  buildEdgesWithRegistry,
  detectSSOTViolationsWithRegistry,
  getDefaultSSOTRuleRegistry,
  registerSSOTRule,
  resetDefaultSSOTRuleRegistry,
} from "../src/core/ssot-rule-registry.js";
import type { GraphNode } from "../src/core/change-graph/types.js";

function makeNode(
  id: string,
  phase: string,
  kind: GraphNode["kind"],
  label: string,
  data: Record<string, unknown> = {},
): GraphNode {
  return { id, phase: phase as any, kind, label, data };
}

beforeEach(() => {
  resetDefaultSSOTRuleRegistry();
  getDefaultSSOTRuleRegistry();
});

describe("ssot-rule-registry: end-to-end with ChangeGraph", () => {
  it("ChangeGraph.buildEdges() uses registry rules (default 12 builtin)", () => {
    const graph = new ChangeGraph();
    const threats = [
      makeNode("design-threat-0", "design", "threat", "Threat 1"),
      makeNode("design-threat-1", "design", "threat", "Threat 2"),
    ];
    const tests = [
      makeNode("test-test_case-0", "test", "test_case", "TC for T1"),
      makeNode("test-test_case-1", "test", "test_case", "TC for T2"),
    ];
    for (const n of [...threats, ...tests]) {
      graph.addNode(n.phase, n.kind, n.id, n.label, n.data);
    }
    graph.buildEdges();
    // builtin rule "design-threat-to-test-case" has matchRefField "testedBy"
    // but no src has testedBy → falls back to positional pairing
    const e0 = graph.getEdges("design-threat-0");
    const e1 = graph.getEdges("design-threat-1");
    // threat-0 ↔ test_case-0, threat-1 ↔ test_case-1 (positional)
    expect(e0.some((x) => x.to === "test-test_case-0")).toBe(true);
    expect(e1.some((x) => x.to === "test-test_case-1")).toBe(true);
  });

  it("ChangeGraph uses ID-reference when src has matchRefField data", () => {
    const graph = new ChangeGraph();
    // Register a custom rule that uses ID reference
    registerSSOTRule({
      id: "custom-ref-rule",
      fromPhases: ["change"],
      fromKind: "risk",
      toPhases: ["requirement"],
      toKind: "nfr",
      edgeKind: "derives_from",
      matchRefField: "mitigatedBy",
    });
    const change = makeNode("change-risk-0", "change", "risk", "Auth bypass", {
      mitigatedBy: ["req-nfr-99"],  // explicit ID ref
    });
    const req99 = makeNode("req-nfr-99", "requirement", "nfr", "Auth NFR");
    const reqOther = makeNode("req-nfr-0", "requirement", "nfr", "Other NFR");
    graph.addNode(change.phase, change.kind, change.id, change.label, change.data);
    graph.addNode(req99.phase, req99.kind, req99.id, req99.label, req99.data);
    graph.addNode(reqOther.phase, reqOther.kind, reqOther.id, reqOther.label, reqOther.data);
    graph.buildEdges();
    const e = graph.getEdges("change-risk-0");
    // Should link to req-nfr-99 (explicit ref), not req-nfr-0 (positional)
    expect(e.some((x) => x.to === "req-nfr-99")).toBe(true);
    expect(e.some((x) => x.to === "req-nfr-0")).toBe(false);
  });

  it("ChangeGraph.findSSOTViolations() uses registry violation rules", () => {
    const graph = new ChangeGraph();
    // 2 risks with very different labels (should trigger violation)
    const r1 = makeNode("change-risk-0", "change", "risk", "Auth bypass vulnerability");
    const r2 = makeNode("change-risk-1", "change", "risk", "Database corruption on disk full");
    graph.addNode(r1.phase, r1.kind, r1.id, r1.label, r1.data);
    graph.addNode(r2.phase, r2.kind, r2.id, r2.label, r2.data);
    // 1 NFR
    const nfr = makeNode("req-nfr-0", "requirement", "nfr", "Auth must be enforced");
    graph.addNode(nfr.phase, nfr.kind, nfr.id, nfr.label, nfr.data);
    graph.buildEdges();
    const v = graph.findSSOTViolations();
    // change.risk → requirement.nfr is violationEnabled builtin rule
    // positional: r1 ↔ nfr → labels differ → violation
    expect(v.length).toBeGreaterThan(0);
  });

  it("legacy buildEdges still works for backward compat (regression)", () => {
    const nodes = new Map<string, GraphNode>();
    nodes.set("design-threat-0", makeNode("design-threat-0", "design", "threat", "T"));
    nodes.set("test-test_case-0", makeNode("test-test_case-0", "test", "test_case", "TC"));
    const edges = new Map<string, any[]>();
    legacyBuildEdges(nodes, edges);
    // legacy still uses hardcoded EDGE_CATALOG + positional
    const e = edges.get("design-threat-0") ?? [];
    expect(e.length).toBeGreaterThan(0);
  });

  it("legacy EDGE_CATALOG is preserved (regression for exports)", () => {
    expect(EDGE_CATALOG.length).toBe(12);
    expect(EDGE_CATALOG[0]?.fromKind).toBe("risk");
  });

  it("legacy detectSSOTViolations still works (regression)", () => {
    const nodes = new Map<string, GraphNode>();
    nodes.set("change-risk-0", makeNode("change-risk-0", "change", "risk", "Auth bypass"));
    nodes.set("req-nfr-0", makeNode("req-nfr-0", "requirement", "nfr", "Auth must work"));
    const edges = new Map<string, any[]>();
    const v = legacyDetectSSOT(nodes, edges);
    // Labels differ → 1 violation
    expect(v.length).toBeGreaterThan(0);
  });
});
