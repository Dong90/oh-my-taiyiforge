import { describe, expect, it } from "vitest";
import {
  normalizeComplexity,
  normalizeCurrentPhase,
  normalizeState,
} from "../src/core/normalize-state.js";
import type { ChangeState } from "../src/core/types.js";

describe("normalize-state", () => {
  it("coerces legacy string complexity", () => {
    const c = normalizeComplexity("medium");
    expect(c).toEqual({ level: "medium", score: 0, recommendedSkills: [] });
  });

  it("maps currentPhase complete → integration", () => {
    const raw = {
      slug: "x",
      currentPhase: "complete",
      completedPhases: [
        "change",
        "requirement",
        "design",
        "ui-design",
        "task",
        "dev",
        "test",
        "review",
        "integration",
      ],
      profile: "full",
      skippedPhases: [],
      strictDev: false,
      auxiliaryCompleted: [],
      createdAt: "",
      updatedAt: "",
    } as ChangeState;
    expect(normalizeCurrentPhase(raw)).toBe("integration");
    const n = normalizeState(raw);
    expect(n.currentPhase).toBe("integration");
    expect(n.workflowStatus).toBe("completed");
  });

  it("fills missing recommendedSkills array", () => {
    const raw = {
      slug: "x",
      currentPhase: "design",
      completedPhases: ["change", "requirement"],
      profile: "full",
      skippedPhases: [],
      strictDev: false,
      auxiliaryCompleted: [],
      complexity: { level: "high", score: 10 } as ChangeState["complexity"],
      createdAt: "",
      updatedAt: "",
    } as ChangeState;
    const n = normalizeState(raw);
    expect(n.complexity?.recommendedSkills).toEqual([]);
  });
});
