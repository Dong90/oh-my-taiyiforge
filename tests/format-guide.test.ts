import { describe, expect, it } from "vitest";
import {
  formatPhaseProgressLine,
  formatStatusPlain,
} from "../src/core/format-guide.js";
import type { PhaseGuide } from "../src/core/phase-guide.js";

function baseGuide(overrides: Partial<PhaseGuide> = {}): PhaseGuide {
  return {
    slug: "demo",
    profile: "full",
    skippedPhases: [],
    currentPhase: "design",
    workflowCompleted: false,
    completedCount: 2,
    totalPhases: 9,
    skill: "taiyi-design",
    artifact: "DESIGN.md",
    artifactPath: ".taiyi/changes/demo/DESIGN.md",
    artifactExists: true,
    qualityReady: false,
    qualityHints: ["补充架构图"],
    nextAction: "完善 DESIGN.md，再 /taiyi:continue",
    nextPhase: "ui-design",
    nextSkill: "taiyi-ui-design",
    requiresHumanGate: true,
    recommendedAuxiliary: [],
    pendingAuxiliary: [],
    auxiliaryCompleted: [],
    autoHarness: true,
    ...overrides,
  };
}

describe("format-guide", () => {
  it("formatPhaseProgressLine shows order and skill", () => {
    const line = formatPhaseProgressLine(baseGuide());
    expect(line).toContain("design（3/9）");
    expect(line).toContain("taiyi-design");
    expect(line).toContain("/taiyi:continue");
  });

  it("formatPhaseProgressLine uses apply for dev", () => {
    const line = formatPhaseProgressLine(baseGuide({ currentPhase: "dev", skill: "taiyi-dev" }));
    expect(line).toContain("/taiyi:apply");
  });

  it("formatStatusPlain includes progress and hints", () => {
    const text = formatStatusPlain(baseGuide());
    expect(text).toContain("# demo");
    expect(text).toContain("design（3/9）");
    expect(text).toContain("补充架构图");
    expect(text).toContain("/taiyi:status");
  });

  it("formatStatusPlain shows intent analysis when signals present", () => {
    const text = formatStatusPlain(
      baseGuide({
        intentSignals: { touchedModules: 4, hasUi: false, testLevels: 2 },
        complexity: { level: "medium", score: 5, recommendedSkills: [] },
      }),
    );
    expect(text).toContain("意图分析:");
    expect(text).toContain("无 UI");
    expect(text).toContain("复杂度 medium");
  });
});
