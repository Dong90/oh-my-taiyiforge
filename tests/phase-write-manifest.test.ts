import { describe, expect, it, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { runPhaseWriteGuide } from "../src/core/phase-write.js";
import { resetWorkflowManifestCache } from "../src/integrations/workflow-manifest.js";

describe("phase-write manifest hints", () => {
  afterEach(() => {
    delete process.env.TAIYI_WORKFLOW_MANIFEST;
    resetWorkflowManifestCache();
  });

  it("uses optimized manifest hooks instead of a fixed phase hint", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-hints-"));
    try {
      process.env.TAIYI_WORKFLOW_MANIFEST = "optimized";
      resetWorkflowManifestCache();
      const engine = new WorkflowEngine(path.join(workspace, ".taiyi"));
      engine.initChange("hint-demo", { profile: "full" });
      const result = runPhaseWriteGuide(engine, workspace, path.join(workspace, ".taiyi"), "hint-demo", "task");
      expect(result.text).toContain("/taiyi:skill ecc tdd-workflow?");
      expect(result.text).not.toContain("/taiyi:skill ecc autonomous-loops");
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  });
});
