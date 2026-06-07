import { describe, expect, it } from "vitest";
import { isWorkflowCompleted } from "../src/core/change-status.js";
import type { ChangeState } from "../src/core/types.js";

function base(overrides: Partial<ChangeState> = {}): ChangeState {
  return {
    slug: "x",
    currentPhase: "integration",
    completedPhases: [],
    profile: "full",
    skippedPhases: [],
    strictDev: false,
    autoHarness: false,
    auxiliaryCompleted: [],
    workflowStatus: "active",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("change-status", () => {
  it("requires integration in completedPhases even when workflowStatus is completed", () => {
    expect(
      isWorkflowCompleted(
        base({
          workflowStatus: "completed",
          completedPhases: ["change", "requirement"],
        }),
      ),
    ).toBe(false);
  });

  it("is complete when integration is in completedPhases and count matches profile", () => {
    const completed = [
      "change",
      "requirement",
      "design",
      "ui-design",
      "task",
      "dev",
      "test",
      "review",
      "integration",
    ];
    expect(
      isWorkflowCompleted(
        base({
          workflowStatus: "completed",
          completedPhases: completed,
        }),
      ),
    ).toBe(true);
  });
});
