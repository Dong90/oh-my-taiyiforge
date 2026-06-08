import { describe, expect, it } from "vitest";
import {
  auxiliaryForPhaseFromManifest,
  formatPhaseWorkflowPlain,
  getHarnessHooksFromManifest,
  getPhaseFromManifest,
  getWorkflowManifest,
  resetWorkflowManifestCache,
} from "../src/integrations/workflow-manifest.js";

describe("workflow-manifest", () => {
  it("loads all nine phases with harness hooks", () => {
    resetWorkflowManifestCache();
    const m = getWorkflowManifest();
    expect(Object.keys(m.phases)).toContain("change");
    expect(Object.keys(m.phases)).toContain("integration");
    expect(m.gates.human_phases).toContain("change");
    expect(m.gates.human_phases).toContain("review");
  });

  it("maps dev phase with TDD and engine gate", () => {
    resetWorkflowManifestCache();
    const dev = getPhaseFromManifest("dev");
    expect(dev?.superpowers).toContain("test-driven-development");
    expect(dev?.engine_gate).toMatch(/dev-complete/i);
    expect(dev?.harness.some((h) => h.skill === "test-driven-development" && !h.optional)).toBe(
      true,
    );
  });

  it("includes unconditional auxiliary skills per phase", () => {
    resetWorkflowManifestCache();
    expect(auxiliaryForPhaseFromManifest("change")).toContain("taiyi-intel-scan");
    expect(auxiliaryForPhaseFromManifest("change")).not.toContain("taiyi-compress");
    expect(auxiliaryForPhaseFromManifest("review")).not.toContain("taiyi-health");
    expect(getPhaseFromManifest("design")?.auxiliary).toContain("taiyi-architect");
    expect(getPhaseFromManifest("review")?.auxiliary).toContain("taiyi-health");
  });

  it("formats review phase with harness and auxiliary", () => {
    resetWorkflowManifestCache();
    const text = formatPhaseWorkflowPlain("review");
    expect(text).toContain("requesting-code-review");
    expect(text).toContain("taiyi-health");
    expect(text).toContain("harness");
    expect(text).toContain("人工门");
  });

  it("has playwright and semgrep hooks on test/review", () => {
    resetWorkflowManifestCache();
    expect(getHarnessHooksFromManifest("test").some((h) => h.tool === "playwright")).toBe(true);
    expect(getHarnessHooksFromManifest("review").some((h) => h.tool === "semgrep")).toBe(true);
    expect(getHarnessHooksFromManifest("review").some((h) => h.tool === "trivy")).toBe(true);
  });

  it("includes optional taiyi-ultrawork on task and dev", () => {
    resetWorkflowManifestCache();
    const taskHook = getHarnessHooksFromManifest("task").find((h) => h.skill === "taiyi-ultrawork");
    const devHook = getHarnessHooksFromManifest("dev").find((h) => h.skill === "taiyi-ultrawork");
    expect(taskHook?.optional).toBe(true);
    expect(devHook?.optional).toBe(true);
    expect(taskHook?.tool).toBe("taiyi");
  });

  it("profiles skip phases for lite", () => {
    resetWorkflowManifestCache();
    const lite = getWorkflowManifest().profiles.lite;
    expect(lite?.skip_phases).toContain("design");
    expect(lite?.skip_phases).toContain("review");
  });
});
