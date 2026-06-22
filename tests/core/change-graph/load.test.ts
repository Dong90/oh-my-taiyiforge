import { describe, it, expect } from "vitest";
import { ChangeGraph, EDGE_CATALOG } from "../../../src/core/change-graph/index.js";
import type { GraphNode, EdgeKind } from "../../../src/core/change-graph/types.js";
import type { PhaseId } from "../../src/core/types.js";

const minimalFixtures: Record<string, object> = {
  change: {
    risks: [{ risk: "e2e false positive", probability: "中", impact: "误拦发布", mitigation: "CI retry" }],
    rollback_trigger: "E2E 持续失败 >2 次",
    success_criteria: [{ id: "SC-01", description: "nine phases complete", is_checked: true }],
  },
  requirement: {
    acceptance_criteria: [{ id: "AC-01", description: "state shows completed", is_checked: true }],
    non_functional: {
      security: [{ id: "NFR-S01", description: "no hardcoded secrets" }],
      performance: [{ id: "NFR-P01", description: "<60s E2E" }],
    },
  },
  design: {
    security_threats: [{ threat: "Spoofing", vector: "CLI args", mitigation: "commander validation" }],
    rollback_trigger: "CI retry >2 then revert",
    modules: [{ name: "Workflow Engine", operation: "修改", path: "src/core/workflow-engine.ts" }],
    decision: { chosen: "B", reason: "Automated regression" },
    rollout_steps: ["merge PR", "CI test", "npm publish"],
  },
};

describe("ChangeGraph — loading & node management", () => {
  it("constructs an empty graph", () => {
    const g = new ChangeGraph();
    expect(g.nodeCount).toBe(0);
    expect(g.edgeCount).toBe(0);
    expect(g.nodesByKind("risk")).toEqual([]);
  });

  it("loadFromFixtures populates nodes", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    expect(g.nodeCount).toBeGreaterThan(0);
  });

  it("loadFromFixtures creates risk nodes from change phase", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    const risks = g.nodesByKind("risk");
    expect(risks.length).toBeGreaterThanOrEqual(1);
    expect(risks[0].phase).toBe("change");
  });

  it("loadFromFixtures creates acceptance_criterion nodes", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    const acs = g.nodesByKind("acceptance_criterion");
    expect(acs.length).toBeGreaterThanOrEqual(1);
  });

  it("loadFromFixtures creates nfr nodes from non_functional", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    const nfrs = g.nodesByKind("nfr");
    expect(nfrs.length).toBeGreaterThanOrEqual(2);
  });

  it("loadFromFixtures creates threat nodes from design", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    const threats = g.nodesByKind("threat");
    expect(threats.length).toBeGreaterThanOrEqual(1);
    expect(threats[0].phase).toBe("design");
  });

  it("loadFromFixtures creates deployment_step nodes from rollout_steps", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    const steps = g.nodesByKind("deployment_step");
    expect(steps.length).toBeGreaterThanOrEqual(1);
  });

  it("nodesByPhase filters correctly", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    const changeNodes = g.nodesByPhase("change");
    for (const n of changeNodes) {
      expect(n.phase).toBe("change");
    }
  });

  it("getNode returns a node by ID", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    const risks = g.nodesByKind("risk");
    expect(risks.length).toBeGreaterThan(0);
    const found = g.getNode(risks[0].id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(risks[0].id);
  });

  it("getNode returns undefined for missing ID", () => {
    const g = new ChangeGraph();
    expect(g.getNode("nonexistent")).toBeUndefined();
  });

  it("getEdges returns empty for node with no edges", () => {
    const g = ChangeGraph.fromFixtures(minimalFixtures);
    const risks = g.nodesByKind("risk");
    expect(risks.length).toBeGreaterThan(0);
    expect(g.getEdges(risks[0].id)).toEqual([]);
  });

  it("addNode + addEdge work", () => {
    const g = new ChangeGraph();
    g.addNode("change" as PhaseId, "risk", "test-1", "Test Risk", { key: "val" });
    g.addNode("requirement" as PhaseId, "nfr", "test-2", "Test NFR", {});
    g.addEdge("test-1", "test-2", "derives_from" as EdgeKind);

    expect(g.nodeCount).toBe(2);
    expect(g.edgeCount).toBe(1);
    expect(g.getEdges("test-1")).toHaveLength(1);
    expect(g.getEdges("test-1")[0].kind).toBe("derives_from");
  });

  it("addEdge deduplicates same from+to+kind", () => {
    const g = new ChangeGraph();
    g.addNode("change" as PhaseId, "risk", "id1", "R1", {});
    g.addNode("requirement" as PhaseId, "nfr", "id2", "N1", {});
    g.addEdge("id1", "id2", "derives_from" as EdgeKind);
    g.addEdge("id1", "id2", "derives_from" as EdgeKind);
    expect(g.edgeCount).toBe(1);
  });

  it("empty graph: all queries return safe defaults", () => {
    const g = new ChangeGraph();
    expect(g.nodeCount).toBe(0);
    expect(g.edgeCount).toBe(0);
    expect(g.nodesByKind("risk")).toEqual([]);
    expect(g.nodesByPhase("change")).toEqual([]);
    expect(g.getNode("x")).toBeUndefined();
    expect(g.getEdges("x")).toEqual([]);
  });

  it("load returns ok:false for non-existent directory", () => {
    const g = new ChangeGraph();
    const result = g.load("/tmp/nonexistent-change-graph-test-dir");
    expect(result.ok).toBe(false);
  });

  it("EDGE_CATALOG is not empty", () => {
    expect(EDGE_CATALOG.length).toBeGreaterThan(0);
  });
});
