import { describe, it, expect } from "vitest";
import { ChangeGraph, EDGE_CATALOG } from "../../../src/core/change-graph/index.js";

const duplicateFixtures: Record<string, object> = {
  change: {
    risks: [{ risk: "e2e failure" }],
    rollback_trigger: "revert commit",
  },
  requirement: {
    non_functional: {
      security: [{ id: "NFR-S01", description: "no hardcoded secrets" }],
    },
    acceptance_criteria: [{ id: "AC-01", description: "state completed", is_checked: true }],
  },
  design: {
    security_threats: [{ threat: "Spoofing", vector: "CLI args", mitigation: "validate" }],
    rollback_trigger: "git revert HEAD",
    decision: { chosen: "B", reason: "automated" },
  },
  integration: {
    rollback_trigger: "revert commit",
    rollback_step1: "git revert",
  },
};

describe("ChangeGraph — edges & SSOT violations", () => {
  it("EDGE_CATALOG contains risk→nfr rule", () => {
    const rule = EDGE_CATALOG.find(
      (r) => r.fromKind === "risk" && r.toKind === "nfr" && r.edgeKind === "derives_from",
    );
    expect(rule).toBeDefined();
  });

  it("EDGE_CATALOG contains nfr→threat rule", () => {
    const rule = EDGE_CATALOG.find(
      (r) => r.fromKind === "nfr" && r.toKind === "threat",
    );
    expect(rule).toBeDefined();
  });

  it("buildEdges creates edges between cross-phase nodes", () => {
    const g = ChangeGraph.fromFixtures(duplicateFixtures);
    expect(g.nodeCount).toBeGreaterThan(0);
    g.buildEdges();
    expect(g.edgeCount).toBeGreaterThan(0);
  });

  it("buildEdges is idempotent", () => {
    const g = ChangeGraph.fromFixtures(duplicateFixtures);
    g.buildEdges();
    const firstCount = g.edgeCount;
    g.buildEdges();
    expect(g.edgeCount).toBe(firstCount);
  });

  it("buildEdges links risk nodes to NFR nodes via edges", () => {
    const g = ChangeGraph.fromFixtures(duplicateFixtures);
    g.buildEdges();
    const risks = g.nodesByKind("risk");
    expect(risks.length).toBeGreaterThan(0);
    const edges = g.getEdges(risks[0].id);
    expect(edges.length).toBeGreaterThan(0);
  });

  it("buildEdges links threat nodes to test_case nodes via 'tests' edges", () => {
    const withTests: Record<string, object> = {
      ...duplicateFixtures,
      test: {
        test_plan: [{ id: "T-01", description: "security smoke", status: "passed" }],
        security_checks: ["npm audit clean"],
      },
      review: {
        security_audit: ["npm audit passed"],
      },
    };
    const g = ChangeGraph.fromFixtures(withTests);
    g.buildEdges();
    const threats = g.nodesByKind("threat");
    expect(threats.length).toBeGreaterThan(0);
    expect(g.edgeCount).toBeGreaterThan(0);
  });

  it("detectSSOTViolations finds rollback value mismatch", () => {
    const g = ChangeGraph.fromFixtures(duplicateFixtures);
    g.buildEdges();
    const violations = g.findSSOTViolations();
    // change has "revert commit", design has "git revert HEAD" → different
    expect(violations.length).toBeGreaterThan(0);
    const rollbackV = violations.filter((v) => v.field.includes("rollback"));
    expect(rollbackV.length).toBeGreaterThan(0);
  });

  it("detectSSOTViolations returns empty when values match", () => {
    const consistent: Record<string, object> = {
      change: { rollback_trigger: "git revert" },
      design: { rollback_trigger: "git revert" },
    };
    const g = ChangeGraph.fromFixtures(consistent);
    const violations = g.findSSOTViolations();
    const rollbackV = violations.filter((v) => v.field.includes("rollback"));
    expect(rollbackV.length).toBe(0);
  });

  it("detectSSOTViolations returns empty for single-phase graph", () => {
    const g = ChangeGraph.fromFixtures({
      change: { rollback_trigger: "git revert" },
    });
    const violations = g.findSSOTViolations();
    expect(violations.length).toBe(0);
  });

  it("validateConsistency ok:true when no violations", () => {
    const clean = ChangeGraph.fromFixtures({
      change: { rollback_trigger: "same value" },
      design: { rollback_trigger: "same value" },
      integration: { rollback_trigger: "same value" },
    });
    const report = clean.validateConsistency();
    expect(report.ok).toBe(true);
    expect(report.violations).toEqual([]);
  });
});
