import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { E2E_PHASE_ORDER } from "../src/core/e2e-fixtures.js";
import {
  AGENT_ROLES,
  listAgentRoleIds,
  PHASE_AGENT_ROLES,
} from "../src/core/agent-roles.js";
import {
  EXPECTED_CHANGE_ARTIFACTS,
  copyFullFlowDemoFixture,
  loadSlashFlowManifest,
  runForge,
  runSlashFlow,
} from "../src/core/run-slash-flow-cli.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FLOW = loadSlashFlowManifest(REPO);

describe("examples/full-flow-demo — 九阶段 + Agent 斜杠 E2E", () => {
  it("slash-flow.json 与 29 Agent 元数据一致", () => {
    expect(listAgentRoleIds().length).toBe(29);
    expect(FLOW.humanGatePhases).toEqual(["change", "design", "review"]);
    for (const phase of E2E_PHASE_ORDER) {
      for (const roleId of PHASE_AGENT_ROLES[phase]) {
        expect(AGENT_ROLES[roleId], `phase ${phase} → ${roleId}`).toBeDefined();
      }
    }
  });

  it(
    "隔离 workspace：全流程 + 29 Agent + 工件落盘断言",
    () => {
      const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-full-flow-"));
      try {
        copyFullFlowDemoFixture(REPO, workspace);

        const result = runSlashFlow({
          repoRoot: REPO,
          workspaceDir: workspace,
          manifest: FLOW,
          cleanTaiyi: true,
          verifyAllAgents: true,
          runWorkflowSmoke: true,
          runFinish: true,
        });

        expect(result.errors, result.errors.join("\n")).toEqual([]);
        expect(result.ok).toBe(true);
        expect(result.completedPhases).toHaveLength(9);
        expect(result.generatedFiles).toHaveLength(EXPECTED_CHANGE_ARTIFACTS.length);

        for (const name of EXPECTED_CHANGE_ARTIFACTS) {
          expect(fs.existsSync(path.join(result.changeDir, name)), name).toBe(true);
        }

        const list = runForge(REPO, workspace, ["agent", "list", result.slug]);
        expect(list.code).toBe(0);
      } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
      }
    },
    300_000,
  );
});
