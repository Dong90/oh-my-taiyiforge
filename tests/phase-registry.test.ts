import { describe, expect, it } from "vitest";
import {
  getPhase,
  getPhaseOrder,
  listPhases,
  canEnterPhase,
} from "../src/core/phase-registry.js";

describe("phase-registry", () => {
  it("lists nine main phases in order", () => {
    const phases = listPhases();
    expect(phases).toHaveLength(9);
    expect(phases.map((p) => p.id)).toEqual([
      "change",
      "requirement",
      "design",
      "ui-design",
      "task",
      "dev",
      "test",
      "review",
      "integration",
    ]);
  });

  it("maps each phase to skill and artifact", () => {
    const design = getPhase("design");
    expect(design.skill).toBe("taiyi-design");
    expect(design.artifact).toBe("DESIGN.md");
  });

  it("rejects entering requirement without change artifact", () => {
    const result = canEnterPhase("requirement", { completedPhases: [] });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("change");
  });

  it("allows requirement when change is completed", () => {
    const result = canEnterPhase("requirement", {
      completedPhases: ["change"],
    });
    expect(result.ok).toBe(true);
  });

  it("orders phases monotonically", () => {
    expect(getPhaseOrder("change")).toBeLessThan(getPhaseOrder("dev"));
    expect(getPhaseOrder("integration")).toBe(9);
  });
});
