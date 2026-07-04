import { describe, expect, it } from "vitest";
import {
  auxiliaryForPhaseFromManifest,
  auxiliarySkillIdsForPhase,
  formatPhaseWorkflowPlain,
  getHarnessHooksFromManifest,
  getPhaseFromManifest,
  getWorkflowManifest,
  resetWorkflowManifestCache,
} from "../src/integrations/workflow-manifest.js";
import { getHarnessContext } from "../src/integrations/harness-hooks.js";
import { DEFAULT_HUMAN_GATE_PHASES } from "../src/core/gates/human-gate-config.js";

describe("workflow-manifest", () => {
  it("loads all nine phases with harness hooks", () => {
    resetWorkflowManifestCache();
    const m = getWorkflowManifest();
    expect(Object.keys(m.phases)).toContain("change");
    expect(Object.keys(m.phases)).toContain("integration");
    for (const hp of DEFAULT_HUMAN_GATE_PHASES) {
      expect(m.phases[hp]?.human_gate, hp).toBe(true);
    }
  });

  it("maps dev phase with ecc tdd-workflow and engine gate", () => {
    resetWorkflowManifestCache();
    const dev = getPhaseFromManifest("dev");
    expect(dev?.superpowers).not.toContain("test-driven-development");
    expect(dev?.engine_gate).toMatch(/dev-complete/i);
    expect(dev?.harness.some((h) => h.skill === "tdd-workflow" && h.tool === "ecc" && !h.optional)).toBe(
      true,
    );
  });

  it("includes unconditional auxiliary skills per phase", () => {
    resetWorkflowManifestCache();
    expect(auxiliaryForPhaseFromManifest("change")).toContain("taiyi-intel-scan");
    expect(auxiliaryForPhaseFromManifest("change")).not.toContain("taiyi-compress");
    expect(auxiliaryForPhaseFromManifest("review")).not.toContain("taiyi-health");
    expect(auxiliarySkillIdsForPhase("design")).toContain("taiyi-architect");
    expect(auxiliarySkillIdsForPhase("review")).toContain("taiyi-health");
  });

  it("formats review phase with harness and auxiliary", () => {
    resetWorkflowManifestCache();
    const text = formatPhaseWorkflowPlain("review");
    expect(text).toContain("ecc/security-scan");
    expect(text).toContain("taiyi-health");
    expect(text).toContain("人工门");
    expect(text).toContain("invoke-routing");
  });

  it("resolves playwright on test and ecc security on review", () => {
    resetWorkflowManifestCache();
    const tmp = process.cwd();
    expect(getHarnessContext(tmp, "feat", "test").hooks.some((h) => h.tool === "playwright")).toBe(true);
    const review = getHarnessContext(tmp, "feat", "review");
    expect(review.hooks.some((h) => h.tool === "ecc" && h.skill === "security-scan")).toBe(true);
    expect(review.hooks.some((h) => h.tool === "semgrep")).toBe(false);
  });

  it("includes optional taiyi-ultrawork on task and dev", () => {
    resetWorkflowManifestCache();
    const taskHook = getHarnessHooksFromManifest("task").find((h) => h.skill === "taiyi-ultrawork");
    const devHook = getHarnessHooksFromManifest("dev").find((h) => h.skill === "taiyi-ultrawork");
    expect(taskHook?.optional).toBe(true);
    expect(devHook?.optional).toBe(true);
    expect(taskHook?.tool).toBe("taiyi");
  });

});
