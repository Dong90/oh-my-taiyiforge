import { describe, it, expect } from "vitest";
import { ChangeGraph } from "../../../src/core/change-graph/index.js";

const queryFixtures: Record<string, object> = {
  change: {
    risks: [{ risk: "e2e failure", probability: "中" }],
    rollback_trigger: "git revert",
    rollout_steps: ["merge PR", "CI test"],
  },
  requirement: {
    acceptance_criteria: [{ id: "AC-01", description: "state completed", is_checked: true }],
    non_functional: {
      security: [{ id: "NFR-S01", description: "no hardcoded secrets" }],
      performance: [{ id: "NFR-P01", description: "<60s E2E" }],
      availability: [{ id: "NFR-A01", description: "CI 99%+" }],
    },
  },
  design: {
    security_threats: [{ threat: "Spoofing", vector: "CLI", mitigation: "validate" }],
    rollback_trigger: "git revert",
    decision: { chosen: "B", reason: "automated" },
  },
  test: {
    test_plan: [{ id: "T-01", description: "smoke test", status: "passed" }],
    security_checks: ["npm audit clean"],
  },
  integration: {
    monitoring: [{ metric: "E2E pass rate", baseline: "100%", threshold: "<100%", severity: "high" }],
    rollback_trigger: "git revert",
  },
};

describe("ChangeGraph — query & cross-cutting", () => {
  it("getCrossCutting('security') returns risk+nfr+threat+test_case nodes", () => {
    const g = ChangeGraph.fromFixtures(queryFixtures);
    g.buildEdges();
    const sub = g.getCrossCutting("security");
    expect(sub.nodes.length).toBeGreaterThan(0);
    const kinds = new Set(sub.nodes.map((n) => n.kind));
    expect(kinds.has("risk")).toBe(true);
    expect(kinds.has("nfr")).toBe(true);
    expect(kinds.has("threat")).toBe(true);
    expect(kinds.has("test_case")).toBe(true);
  });

  it("getCrossCutting('security') includes edges", () => {
    const g = ChangeGraph.fromFixtures(queryFixtures);
    g.buildEdges();
    const sub = g.getCrossCutting("security");
    expect(sub.edges.length).toBeGreaterThan(0);
  });

  it("getCrossCutting('rollback') returns rollback nodes", () => {
    const g = ChangeGraph.fromFixtures(queryFixtures);
    g.buildEdges();
    const sub = g.getCrossCutting("rollback");
    expect(sub.nodes.length).toBeGreaterThan(0);
    for (const n of sub.nodes) {
      expect(["rollback", "deployment_step"]).toContain(n.kind);
    }
  });

  it("getCrossCutting('performance') returns nfr nodes", () => {
    const g = ChangeGraph.fromFixtures(queryFixtures);
    const sub = g.getCrossCutting("performance");
    const nfrs = sub.nodes.filter((n) => n.kind === "nfr");
    expect(nfrs.length).toBeGreaterThan(0);
  });

  it("getCrossCutting with unknown domain returns empty subgraph", () => {
    const g = ChangeGraph.fromFixtures(queryFixtures);
    const sub = g.getCrossCutting("nonexistent_domain");
    expect(sub.nodes).toEqual([]);
    expect(sub.edges).toEqual([]);
  });

  it("validateConsistency returns ok:true when no violations on clean data", () => {
    const clean = ChangeGraph.fromFixtures({
      change: { risks: [{ risk: "same-risk-label" }], rollback_trigger: "same-rollback" },
      requirement: { non_functional: { security: [{ id: "NFR-S01", description: "same-risk-label" }] } },
      design: { rollback_trigger: "same-rollback" },
    });
    const report = clean.validateConsistency();
    expect(report.ok).toBe(true);
    expect(report.violations).toEqual([]);
  });

  it("validateConsistency returns ok:false when violations exist", () => {
    const g = ChangeGraph.fromFixtures({
      change: { rollback_trigger: "A" },
      design: { rollback_trigger: "B" },
    });
    g.findSSOTViolations();
    const report = g.validateConsistency();
    expect(report.ok).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);
  });

  it("validateConsistency summary is non-empty", () => {
    const g = ChangeGraph.fromFixtures(queryFixtures);
    const report = g.validateConsistency();
    expect(report.summary.length).toBeGreaterThan(0);
  });

  it("empty graph: validateConsistency ok:true", () => {
    const g = new ChangeGraph();
    const report = g.validateConsistency();
    expect(report.ok).toBe(true);
    expect(report.summary).toContain("0 节点");
  });

  it("empty graph: getCrossCutting returns empty", () => {
    const g = new ChangeGraph();
    const sub = g.getCrossCutting("security");
    expect(sub.nodes).toEqual([]);
    expect(sub.edges).toEqual([]);
  });
});
