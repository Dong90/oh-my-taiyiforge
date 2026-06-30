import { describe, expect, it, beforeEach } from "vitest";
import {
  SSOTRuleRegistry,
  getDefaultSSOTRuleRegistry,
  resetDefaultSSOTRuleRegistry,
  buildEdgesWithRegistry,
  detectSSOTViolationsWithRegistry,
  type SSOTRuleDefinition,
} from "../src/core/ssot-rule-registry.js";
import { BUILTIN_SSOT_RULES } from "../src/core/builtin-ssot-rules.js";
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

describe("ssot-rule-registry: in-memory register/get/list", () => {
  it("registers an SSOT rule and retrieves via get", () => {
    const reg = new SSOTRuleRegistry();
    const r = reg.register(
      {
        id: "risk-to-nfr",
        fromPhases: ["change"],
        fromKind: "risk",
        toPhases: ["requirement"],
        toKind: "nfr",
        edgeKind: "derives_from",
        matchRefField: "mitigatedBy",
        builtin: false,
      },
      "programmatic",
    );
    expect(r.ok).toBe(true);
    const got = reg.get("risk-to-nfr");
    expect(got).toBeDefined();
    expect(got?.matchRefField).toBe("mitigatedBy");
  });

  it("lists all registered rules", () => {
    const reg = new SSOTRuleRegistry();
    reg.ensureBuiltins();
    reg.register(
      {
        id: "r1",
        fromPhases: ["change"],
        fromKind: "risk",
        toPhases: ["requirement"],
        toKind: "nfr",
        edgeKind: "derives_from",
      },
      "programmatic",
    );
    reg.register(
      {
        id: "r2",
        fromPhases: ["design"],
        fromKind: "threat",
        toPhases: ["test"],
        toKind: "test_case",
        edgeKind: "tests",
      },
      "programmatic",
    );
    const custom = reg.list().filter((r) => r.id === "r1" || r.id === "r2");
    expect(custom).toHaveLength(2);
    // 12 builtins + 2 custom
    expect(reg.list().length).toBe(BUILTIN_SSOT_RULES.length + 2);
  });

  it("builtin rules are loaded on ensureBuiltins()", () => {
    const reg = new SSOTRuleRegistry();
    reg.ensureBuiltins();
    expect(reg.list().filter((r) => r.builtin).length).toBe(BUILTIN_SSOT_RULES.length);
  });

  it("builtin rule cannot be overridden by programmatic source", () => {
    const reg = new SSOTRuleRegistry();
    reg.ensureBuiltins();
    const r = reg.register(
      {
        id: BUILTIN_SSOT_RULES[0]!.id,
        fromPhases: ["change"],
        fromKind: "risk",
        toPhases: ["requirement"],
        toKind: "nfr",
        edgeKind: "derives_from",
      },
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DUPLICATE");
  });
});

describe("ssot-rule-registry: ID-reference edge building", () => {
  it("buildEdges uses ID reference (data[matchRefField]) when present", () => {
    const reg = getDefaultSSOTRuleRegistry();
    reg.ensureBuiltins();
    // Register a rule that connects change.risk → requirement.nfr by ref
    reg.register(
      {
        id: "test-ref-rule",
        fromPhases: ["change"],
        fromKind: "risk",
        toPhases: ["requirement"],
        toKind: "nfr",
        edgeKind: "derives_from",
        matchRefField: "mitigatedBy",
        builtin: false,
      },
      "programmatic",
    );
    const change = makeNode("change-risk-0", "change", "risk", "Auth bypass", {
      mitigatedBy: ["req-nfr-0"],
    });
    const req = makeNode("req-nfr-0", "requirement", "nfr", "Auth required");
    const req2 = makeNode("req-nfr-1", "requirement", "nfr", "Other NFR");
    const nodes = new Map<string, GraphNode>([
      [change.id, change],
      [req.id, req],
      [req2.id, req2],
    ]);
    const edges = new Map<string, any[]>();
    buildEdgesWithRegistry(nodes, edges, reg);
    const e = edges.get("change-risk-0") ?? [];
    expect(e).toHaveLength(1);
    expect(e[0]?.to).toBe("req-nfr-0");
  });

  it("buildEdges falls back to positional pairing when no matchRefField", () => {
    const reg = getDefaultSSOTRuleRegistry();
    reg.ensureBuiltins();
    // Register a rule WITHOUT matchRefField to trigger positional fallback
    reg.register(
      {
        id: "positional-fallback-test",
        fromPhases: ["design"],
        fromKind: "threat",
        toPhases: ["test"],
        toKind: "test_case",
        edgeKind: "tests",
        builtin: false,
      },
      "programmatic",
    );
    // design.threat → test.test_case positional
    const threats = [
      makeNode("design-threat-0", "design", "threat", "T1"),
      makeNode("design-threat-1", "design", "threat", "T2"),
    ];
    const tests = [
      makeNode("test-test_case-0", "test", "test_case", "TC1"),
      makeNode("test-test_case-1", "test", "test_case", "TC2"),
    ];
    const nodes = new Map<string, GraphNode>([
      [threats[0]!.id, threats[0]!],
      [threats[1]!.id, threats[1]!],
      [tests[0]!.id, tests[0]!],
      [tests[1]!.id, tests[1]!],
    ]);
    const edges = new Map<string, any[]>();
    buildEdgesWithRegistry(nodes, edges, reg);
    // threat-0 should link to test_case-0 (positional), NOT test_case-1
    const e0 = edges.get("design-threat-0") ?? [];
    const e1 = edges.get("design-threat-1") ?? [];
    expect(e0.some((x: any) => x.to === "test-test_case-0")).toBe(true);
    expect(e1.some((x: any) => x.to === "test-test_case-1")).toBe(true);
  });

  it("buildEdges handles ID reference that points to a non-existent node gracefully", () => {
    const reg = getDefaultSSOTRuleRegistry();
    reg.ensureBuiltins();
    reg.register(
      {
        id: "ref-missing-target",
        fromPhases: ["change"],
        fromKind: "risk",
        toPhases: ["requirement"],
        toKind: "nfr",
        edgeKind: "derives_from",
        matchRefField: "mitigatedBy",
        builtin: false,
      },
      "programmatic",
    );
    const change = makeNode("change-risk-0", "change", "risk", "Risk", {
      mitigatedBy: ["req-nfr-DOES-NOT-EXIST"],
    });
    const nodes = new Map<string, GraphNode>([[change.id, change]]);
    const edges = new Map<string, any[]>();
    // Should not throw
    expect(() => buildEdgesWithRegistry(nodes, edges, reg)).not.toThrow();
    // No edge should be created
    const e = edges.get("change-risk-0") ?? [];
    expect(e).toHaveLength(0);
  });
});

describe("ssot-rule-registry: default singleton", () => {
  it("getDefaultSSOTRuleRegistry returns singleton", () => {
    resetDefaultSSOTRuleRegistry();
    const a = getDefaultSSOTRuleRegistry();
    const b = getDefaultSSOTRuleRegistry();
    expect(a).toBe(b);
  });
});

// Reference the unused type to satisfy TS noUnused
const _t: SSOTRuleDefinition | undefined = undefined;
void _t;
