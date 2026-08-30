import { describe, expect, it } from "vitest";
import { expectedPhaseCount, isWorkflowCompleted } from "../src/core/change-status.js";
import { registerCustomPhase, resetPhases } from "../src/core/phase-registry.js";
import type { ChangeState } from "../src/core/types.js";

function state(overrides: Partial<ChangeState> = {}): ChangeState {
  return {
    slug: "custom",
    currentPhase: "ship",
    completedPhases: ["change", "ship"],
    profile: "full",
    skippedPhases: ["requirement", "design", "ui-design", "task", "dev", "test", "review"],
    strictDev: false,
    autoHarness: false,
    auxiliaryCompleted: [],
    workflowStatus: "active",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("dynamic phase status", () => {
  it("accepts a registered custom terminal phase", () => {
    registerCustomPhase({ id: "ship", order: 10, skill: "taiyi-ship", artifact: "SHIP.md", kind: "markdown", requires: ["change"] });
    try {
      expect(isWorkflowCompleted(state({ skippedPhases: ["requirement", "design", "ui-design", "task", "dev", "test", "review", "integration"] }))).toBe(true);
    } finally {
      resetPhases();
    }
  });

  it("counts registered required phases rather than assuming nine", () => {
    expect(expectedPhaseCount(state())).toBe(2);
  });

  it("accepts a completed custom terminal phase", () => {
    registerCustomPhase({ id: "ship", order: 10, skill: "taiyi-ship", artifact: "SHIP.md", kind: "markdown", requires: ["change"] });
    try {
      expect(isWorkflowCompleted(state({ skippedPhases: ["requirement", "design", "ui-design", "task", "dev", "test", "review", "integration"] }))).toBe(true);
    } finally {
      resetPhases();
    }
  });
});
