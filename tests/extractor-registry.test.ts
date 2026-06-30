import { describe, expect, it, beforeEach } from "vitest";
import {
  ExtractorRegistry,
  getDefaultExtractorRegistry,
  resetDefaultExtractorRegistry,
  registerExtractor,
  type ExtractorDefinition,
  type ExtractorContext,
} from "../src/core/extractor-registry.js";
import { BUILTIN_EXTRACTORS } from "../src/core/builtin-extractors.js";
import { extractNodesFromPhase } from "../src/core/change-graph/loader.js";
import { safeObjectArray, safeString } from "../src/core/type-guards.js";
import type { GraphNode } from "../src/core/change-graph/types.js";

beforeEach(() => {
  resetDefaultExtractorRegistry();
  getDefaultExtractorRegistry();
});

describe("extractor-registry: in-memory register/get/list", () => {
  it("registers an extractor and retrieves via get", () => {
    const reg = new ExtractorRegistry();
    const r = reg.register(
      {
        phase: "change",
        name: "my-extractor",
        builtin: false,
        extract: (data, _ctx) => {
          const items = safeObjectArray(data.risks);
          return items.map((it: any, i: number) => ({
            id: `change-risk-${i}`,
            phase: "change" as const,
            kind: "risk" as const,
            label: safeString(it.risk) ?? "",
            data: it,
          }));
        },
      },
      "programmatic",
    );
    expect(r.ok).toBe(true);
    expect(reg.get("change", "my-extractor")).toBeDefined();
  });

  it("lists all extractors for a phase", () => {
    const reg = new ExtractorRegistry();
    reg.ensureBuiltins();
    const changeExtractors = reg.listByPhase("change");
    // 1 builtin extractor for change phase
    expect(changeExtractors.length).toBeGreaterThan(0);
  });

  it("builtin extractors are loaded on ensureBuiltins()", () => {
    const reg = new ExtractorRegistry();
    reg.ensureBuiltins();
    const phases = reg.listPhases();
    expect(phases.sort()).toEqual(
      [
        "change",
        "design",
        "integration",
        "requirement",
        "review",
        "task",
        "test",
        "ui-design",
      ].sort(),
    );
    expect(reg.list().filter((e) => e.builtin).length).toBe(
      BUILTIN_EXTRACTORS.length,
    );
  });

  it("builtin extractor cannot be overridden by programmatic source", () => {
    const reg = new ExtractorRegistry();
    reg.ensureBuiltins();
    const first = BUILTIN_EXTRACTORS[0]!;
    const r = reg.register(
      {
        phase: first.phase,
        name: first.name,
        builtin: false,
        extract: () => [],
      },
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DUPLICATE");
  });
});

describe("extractor-registry: extractNodesFromPhase integration", () => {
  it("extractNodesFromPhase uses registry to extract change.risks", () => {
    const data = {
      risks: [{ risk: "Auth bypass" }, { risk: "SQL injection" }],
      success_criteria: [{ description: "SC1" }],
    };
    const nodes = extractNodesFromPhase("change", data);
    const risks = nodes.filter((n) => n.kind === "risk");
    expect(risks.length).toBe(2);
    expect(risks.some((n) => n.label === "Auth bypass")).toBe(true);
  });

  it("extractNodesFromPhase uses registry for requirement.non_functional.nfr", () => {
    const data = {
      acceptance_criteria: [{ description: "AC1" }],
      non_functional: {
        performance: [{ description: "Response < 3s" }],
        security: [{ description: "Encrypted at rest" }],
      },
    };
    const nodes = extractNodesFromPhase("requirement", data);
    const nfrs = nodes.filter((n) => n.kind === "nfr");
    expect(nfrs.length).toBeGreaterThanOrEqual(2);
  });

  it("registers a custom extractor that adds nodes alongside builtins", () => {
    const reg = getDefaultExtractorRegistry();
    reg.ensureBuiltins();
    // Register a custom extractor for review phase
    const r = reg.register(
      {
        phase: "review",
        name: "custom-reviewer",
        builtin: false,
        extract: (data, _ctx) => {
          const items = safeObjectArray(data.custom_metrics);
          return items.map((it: any, i: number) => ({
            id: `review-custom_metric-${i}`,
            phase: "review" as const,
            kind: "test_case" as const,
            label: safeString(it.name) ?? "",
            data: it,
          }));
        },
      },
      "programmatic",
    );
    expect(r.ok).toBe(true);
    const data = {
      findings: [{ description: "Bug found" }],
      custom_metrics: [{ name: "Coverage" }, { name: "Complexity" }],
    };
    const nodes = extractNodesFromPhase("review", data);
    const custom = nodes.filter((n) => n.label === "Coverage" || n.label === "Complexity");
    expect(custom.length).toBe(2);
  });
});

describe("extractor-registry: default singleton", () => {
  it("getDefaultExtractorRegistry returns singleton", () => {
    resetDefaultExtractorRegistry();
    const a = getDefaultExtractorRegistry();
    const b = getDefaultExtractorRegistry();
    expect(a).toBe(b);
  });
});
