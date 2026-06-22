import { describe, it, expect } from "vitest";
import { ChangeGraph } from "../../../src/core/change-graph/index.js";
import type { GraphSnapshot } from "../../../src/core/change-graph/types.js";

const renderFixtures: Record<string, object> = {
  change: {
    risks: [{ risk: "e2e false positive", probability: "中", impact: "误拦发布", mitigation: "CI retry" }],
    rollback_trigger: "E2E 持续失败 >2 次",
    success_criteria: [{ id: "SC-01", description: "nine phases complete", is_checked: true }],
  },
  requirement: {
    acceptance_criteria: [{ id: "AC-01", description: "state shows completed", is_checked: true }],
    non_functional: {
      security: [{ id: "NFR-S01", description: "no hardcoded secrets" }],
    },
  },
  design: {
    security_threats: [{ threat: "Spoofing", vector: "CLI", mitigation: "validate" }],
    decision: { chosen: "B", reason: "automated" },
    modules: [{ name: "Workflow Engine", operation: "修改", path: "src/core/workflow-engine.ts" }],
  },
};

describe("ChangeGraph — rendering & serialization", () => {
  it("renderAgentContext includes phase sections", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    const ctx = g.renderAgentContext("test-change");
    expect(ctx).toContain("## Phases");
    expect(ctx).toContain("change");
    expect(ctx).toContain("requirement");
    expect(ctx).toContain("design");
  });

  it("renderAgentContext includes slug in title", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    const ctx = g.renderAgentContext("my-feature");
    expect(ctx).toContain("my-feature");
  });

  it("renderAgentContext includes stats section", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    const ctx = g.renderAgentContext("test");
    expect(ctx).toContain("## Stats");
    expect(ctx).toContain("Total nodes:");
    expect(ctx).toContain("Total edges:");
  });

  it("renderPhaseSummary('change') includes risk info", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    const summary = g.renderPhaseSummary("change");
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toMatch(/risk|rollback|acceptance/);
  });

  it("renderPhaseSummary('requirement') includes acceptance criteria", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    const summary = g.renderPhaseSummary("requirement");
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toMatch(/acceptance|nfr/);
  });

  it("renderPhaseSummary for phase with 0 nodes returns empty string", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    // "task" phase has no data in renderFixtures
    const summary = g.renderPhaseSummary("task");
    expect(summary).toBe("");
  });

  it("renderAgentContext includes violations section when present", () => {
    const g = ChangeGraph.fromFixtures({
      change: { rollback_trigger: "A" },
      design: { rollback_trigger: "B" },
    });
    g.buildEdges();
    g.findSSOTViolations();
    const ctx = g.renderAgentContext("test");
    expect(ctx).toContain("Cross-Cutting Concerns");
  });

  it("toJSON returns valid GraphSnapshot", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    const snap = g.toJSON();
    expect(snap.nodes.length).toBeGreaterThan(0);
    expect(Array.isArray(snap.edges)).toBe(true);
    // Validate node structure
    const first = snap.nodes[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("phase");
    expect(first).toHaveProperty("kind");
    expect(first).toHaveProperty("label");
  });

  it("toSnapshot alias works same as toJSON", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    const json = g.toJSON();
    const snap = g.toSnapshot();
    expect(snap.nodes.length).toBe(json.nodes.length);
    expect(snap.edges.length).toBe(json.edges.length);
  });

  it("fromJSON restores graph with correct node count", () => {
    const g1 = ChangeGraph.fromFixtures(renderFixtures);
    const snap = g1.toJSON();
    const g2 = ChangeGraph.fromJSON(snap);
    expect(g2.nodeCount).toBe(g1.nodeCount);
  });

  it("toJSON → fromJSON roundtrip preserves node IDs", () => {
    const g1 = ChangeGraph.fromFixtures(renderFixtures);
    const snap = g1.toJSON();
    const g2 = ChangeGraph.fromJSON(snap);
    const ids1 = [...g1.nodes.values()].map((n) => n.id).sort();
    const ids2 = [...g2.nodes.values()].map((n) => n.id).sort();
    expect(ids1).toEqual(ids2);
  });

  it("toJSON output is JSON-serializable", () => {
    const g = ChangeGraph.fromFixtures(renderFixtures);
    const snap = g.toJSON();
    const str = JSON.stringify(snap);
    const parsed = JSON.parse(str);
    expect(parsed.nodes.length).toBe(snap.nodes.length);
    expect(parsed.edges.length).toBe(snap.edges.length);
  });

  it("empty graph toJSON returns empty arrays", () => {
    const g = new ChangeGraph();
    const snap = g.toJSON();
    expect(snap.nodes).toEqual([]);
    expect(snap.edges).toEqual([]);
  });
});
