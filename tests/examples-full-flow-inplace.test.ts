import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_CHANGE_ARTIFACTS,
  assertExpectedArtifacts,
  runSlashFlow,
  writeVerifyReport,
} from "../src/core/run-slash-flow-cli.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = path.join(REPO, "examples/full-flow-demo");

describe("examples/full-flow-demo — 就地生成 .taiyi 工件", () => {
  it(
    "在 example 目录内跑完全流程，落盘 CHANGE…CHANGELOG + verify-report.json",
    () => {
      const result = runSlashFlow({
        repoRoot: REPO,
        workspaceDir: WORKSPACE,
        cleanTaiyi: true,
        verifyAllAgents: true,
        runWorkflowSmoke: true,
        runFinish: true,
      });

      const reportPath = writeVerifyReport(WORKSPACE, result);

      expect(result.errors, result.errors.join("\n")).toEqual([]);
      expect(result.ok).toBe(true);
      expect(fs.existsSync(reportPath)).toBe(true);

      const check = assertExpectedArtifacts(result.changeDir);
      expect(check.missing, check.missing.join(", ")).toEqual([]);

      for (const name of EXPECTED_CHANGE_ARTIFACTS) {
        const p = path.join(result.changeDir, name);
        expect(fs.existsSync(p), `missing ${name} under examples/full-flow-demo`).toBe(true);
      }

      expect(result.generatedFiles.length).toBe(EXPECTED_CHANGE_ARTIFACTS.length);
      expect(fs.existsSync(path.join(WORKSPACE, ".taiyi/changes", result.slug))).toBe(true);
    },
    300_000,
  );
});
