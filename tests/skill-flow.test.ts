import { describe, expect, it } from "vitest";
import {
  formatSkillFlowPlain,
  getPhaseSkillFlow,
  listSuperpowersSkills,
  resetSkillFlowCache,
} from "../src/integrations/skill-flow.js";

describe("skill-flow", () => {
  it("maps dev phase to test-driven-development", () => {
    resetSkillFlowCache();
    const map = getPhaseSkillFlow("dev");
    expect(map?.superpowers).not.toContain("test-driven-development");
    expect(map?.external_optional).toContain("ecc/tdd-workflow");
    expect(map?.slash).toContain("/taiyi:tdd dev");
    expect(map?.engine_gate).toMatch(/dev-complete/i);
  });

  it("formats plain text for review phase", () => {
    resetSkillFlowCache();
    const text = formatSkillFlowPlain("review");
    expect(text).toContain("Agent harness");
    expect(text).toContain("ecc/code-review");
    expect(text).toContain("superpowers/receiving-code-review?");
    expect(text).toContain("ecc/security-scan");
    expect(text).toContain("taiyi-health");
    expect(text).toContain("invoke-routing");
  });

  it("lists superpowers catalog", () => {
    resetSkillFlowCache();
    const skills = listSuperpowersSkills();
    expect(skills.some((s) => s.id === "brainstorming")).toBe(true);
    expect(skills.some((s) => s.id === "brainstorming")).toBe(true);
    expect(skills.some((s) => s.id === "finishing-a-development-branch")).toBe(false);
    expect(skills.some((s) => s.id === "requesting-code-review")).toBe(false);
  });
});
