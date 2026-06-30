import { describe, expect, it, beforeEach } from "vitest";
import {
  SSOTRuleRegistry,
  getDefaultSSOTRuleRegistry,
  resetDefaultSSOTRuleRegistry,
  registerSSOTRule,
  type GraphNode,
} from "../src/core/ssot-rule-registry.js";

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

describe("ssot-rule-registry: cross-source overrides", () => {
  it("yaml source overrides builtin silently (no error)", () => {
    // Register a custom rule with same id as a builtin — should be rejected
    // because builtins cannot be overridden (DUPLICATE error)
    const r = registerSSOTRule({
      id: "design-threat-to-test-case",  // builtin id
      fromPhases: ["design"],
      fromKind: "threat",
      toPhases: ["test"],
      toKind: "test_case",
      edgeKind: "tests",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DUPLICATE");
  });

  it("programmatic source overrides yaml source (same id)", () => {
    // First register via yaml (mocked)
    const reg = getDefaultSSOTRuleRegistry();
    reg.register(
      {
        id: "custom-rule",
        fromPhases: ["design"],
        fromKind: "threat",
        toPhases: ["test"],
        toKind: "test_case",
        edgeKind: "tests",
      },
      "yaml",
    );
    // Then via programmatic
    const r = reg.register(
      {
        id: "custom-rule",
        fromPhases: ["change"],  // different phases to prove override
        fromKind: "risk",
        toPhases: ["requirement"],
        toKind: "nfr",
        edgeKind: "derives_from",
      },
      "programmatic",
    );
    expect(r.ok).toBe(true);
    const def = reg.get("custom-rule");
    expect(def?.fromPhases).toEqual(["change"]);  // overridden
  });
});
