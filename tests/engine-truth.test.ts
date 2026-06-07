import { describe, expect, it } from "vitest";
import { buildEngineTruth } from "../src/core/engine-truth.js";
import type { PhaseGuide } from "../src/core/phase-guide.js";
import type { ChangeState } from "../src/core/types.js";

function guide(partial: Partial<PhaseGuide> = {}): PhaseGuide {
  return {
    slug: "x",
    profile: "full",
    skippedPhases: [],
    currentPhase: "change",
    workflowCompleted: false,
    completedCount: 0,
    totalPhases: 9,
    skill: "taiyi-change",
    artifact: "CHANGE.md",
    artifactPath: ".taiyi/changes/x/CHANGE.md",
    artifactExists: true,
    artifactIsSeed: false,
    qualityReady: false,
    qualityHints: [],
    nextAction: "完善 CHANGE.md",
    nextPhase: "requirement",
    nextSkill: "taiyi-requirement",
    requiresHumanGate: true,
    recommendedAuxiliary: [],
    pendingAuxiliary: [],
    auxiliaryCompleted: [],
    autoHarness: false,
    stepBlockers: ["超前 REQUIREMENT.md"],
    syncActions: ["mark-aux: taiyi-intel-scan"],
    earlyCodeWarning: "dev 前有改动",
    ...partial,
  };
}

describe("engine-truth", () => {
  it("mirrors guide blockers and sync actions", () => {
    const state: ChangeState = {
      slug: "x",
      currentPhase: "change",
      completedPhases: [],
      profile: "full",
      skippedPhases: [],
      strictDev: false,
      autoHarness: false,
      auxiliaryCompleted: [],
      workflowStatus: "active",
      createdAt: "",
      updatedAt: "",
    };
    const truth = buildEngineTruth(state, guide(), { handoffExists: true });
    expect(truth.blockers).toEqual(["超前 REQUIREMENT.md"]);
    expect(truth.syncActions).toEqual(["mark-aux: taiyi-intel-scan"]);
    expect(truth.earlyCodeWarning).toContain("dev 前");
    expect(truth.handoffExists).toBe(true);
    expect(truth.workflowActive).toBe(true);
  });
});
