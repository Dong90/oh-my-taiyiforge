import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_CHANGE_ARTIFACTS,
  assertExpectedArtifacts,
  copyFullFlowDemoFixture,
  runSlashFlow,
} from "../src/core/run-slash-flow-cli.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("run-slash-flow-cli", () => {
  it("临时 workspace 跑完全流程并落盘全部工件", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-slash-cli-"));
    try {
      copyFullFlowDemoFixture(REPO, workspace);

      const result = runSlashFlow({
        repoRoot: REPO,
        workspaceDir: workspace,
        cleanTaiyi: true,
        verifyAllAgents: false,
        runWorkflowSmoke: true,
        runFinish: true,
      });

      expect(result.errors, result.errors.join("\n")).toEqual([]);
      expect(result.ok).toBe(true);
      expect(result.completedPhases).toHaveLength(9);
      expect(result.workflowStatus).toBe("completed");

      const check = assertExpectedArtifacts(result.changeDir);
      expect(check.missing, check.missing.join(", ")).toEqual([]);
      expect(result.generatedFiles).toHaveLength(EXPECTED_CHANGE_ARTIFACTS.length);

      for (const name of EXPECTED_CHANGE_ARTIFACTS) {
        const p = path.join(result.changeDir, name);
        expect(fs.existsSync(p), name).toBe(true);
        expect(fs.statSync(p).size, `${name} empty`).toBeGreaterThan(0);
      }
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }, 180_000);
});
