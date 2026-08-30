import { describe, expect, it, afterEach } from "vitest";
import {
  getPhaseFromManifest,
  resetWorkflowManifestCache,
} from "../src/integrations/workflow-manifest.js";

describe("workflow manifest consistency", () => {
  afterEach(() => {
    delete process.env.TAIYI_WORKFLOW_MANIFEST;
    resetWorkflowManifestCache();
  });

  it.each(["default", "optimized"]) ("provides a complete %s phase map", (preset) => {
    process.env.TAIYI_WORKFLOW_MANIFEST = preset;
    resetWorkflowManifestCache();
    for (const phase of ["change", "requirement", "design", "ui-design", "task", "dev", "test", "review", "integration"]) {
      const map = getPhaseFromManifest(phase);
      expect(map?.taiyi_skill).toBeTruthy();
      expect(map?.artifact).toBeTruthy();
      expect(map?.harness).toBeDefined();
    }
  });

  it("does not duplicate the same hook in a phase", () => {
    process.env.TAIYI_WORKFLOW_MANIFEST = "default";
    resetWorkflowManifestCache();
    const hooks = getPhaseFromManifest("review")?.harness ?? [];
    const keys = hooks.map((hook) => `${hook.tool}/${hook.skill ?? hook.command}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
