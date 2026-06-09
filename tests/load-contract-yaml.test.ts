import { describe, expect, it } from "vitest";
import { loadPhasesFromYaml, FALLBACK_PHASES } from "../src/core/load-phases-yaml.js";
import { loadQualityDimensionsFromYaml } from "../src/core/load-quality-gate-yaml.js";
import { listPhases } from "../src/core/phase-registry.js";
import { QUALITY_DIMENSIONS } from "../src/core/gates/quality-gate.js";

describe("contract yaml loaders", () => {
  it("loads nine phases from phases.yaml", () => {
    const phases = loadPhasesFromYaml(import.meta.url);
    expect(phases).toHaveLength(9);
    expect(phases[0]?.id).toBe("change");
    expect(phases[8]?.id).toBe("integration");
    expect(phases[1]?.requires).toContain("change");
  });

  it("phase-registry uses yaml phases", () => {
    expect(listPhases()).toHaveLength(FALLBACK_PHASES.length);
    expect(listPhases().map((p) => p.id)).toEqual(FALLBACK_PHASES.map((p) => p.id));
  });

  it("loads five quality dimensions from yaml", () => {
    const dims = loadQualityDimensionsFromYaml(import.meta.url);
    expect(dims).toHaveLength(5);
    expect(dims.map((d) => d.id)).toContain("completeness");
  });

  it("quality-gate uses yaml dimensions", () => {
    expect(QUALITY_DIMENSIONS).toHaveLength(5);
  });
});
