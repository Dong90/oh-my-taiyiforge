import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertExpectedArtifacts,
  copyFullFlowDemoFixture,
  getExpectedArtifactsForProfile,
  getPhaseOrderForProfile,
  runForge,
  runSlashFlow,
} from "../src/core/run-slash-flow-cli.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("profile CLI full flow (taiyi-forge.sh)", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-profile-cli-"));
    copyFullFlowDemoFixture(REPO, workspace);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("lite profile 五阶段 CLI + 工件落盘", () => {
    const slug = "lite-cli-flow";
    const r = runSlashFlow({
      repoRoot: REPO,
      workspaceDir: workspace,
      slug,
      profile: "lite",
      cleanTaiyi: true,
      runFinish: true,
    });
    if (!r.ok) {
      expect(r.errors).toEqual([]);
    }
    expect(r.ok).toBe(true);
    expect(r.completedPhases).toEqual(getPhaseOrderForProfile("lite"));
    expect(r.workflowStatus).toBe("completed");

    const check = assertExpectedArtifacts(r.changeDir, "lite");
    expect(check.ok).toBe(true);

    expect(fs.existsSync(path.join(r.changeDir, "DESIGN.md"))).toBe(false);
    expect(fs.existsSync(path.join(r.changeDir, "UI-DESIGN.md"))).toBe(false);
    expect(fs.existsSync(path.join(r.changeDir, "TASK.md"))).toBe(false);
    expect(fs.existsSync(path.join(r.changeDir, "REVIEW.md"))).toBe(false);
    expect(getExpectedArtifactsForProfile("lite")).not.toContain("health-report.md");
  }, 180_000);

  it("api profile 跳过 ui-design，其余八阶段落盘", () => {
    const slug = "api-cli-flow";
    const r = runSlashFlow({
      repoRoot: REPO,
      workspaceDir: workspace,
      slug,
      profile: "api",
      cleanTaiyi: true,
      runFinish: true,
    });
    if (!r.ok) {
      expect(r.errors).toEqual([]);
    }
    expect(r.ok).toBe(true);
    expect(r.completedPhases).toEqual(getPhaseOrderForProfile("api"));
    expect(fs.existsSync(path.join(r.changeDir, "UI-DESIGN.md"))).toBe(false);
    expect(fs.existsSync(path.join(r.changeDir, "DESIGN.md"))).toBe(true);
    expect(fs.existsSync(path.join(r.changeDir, "REVIEW.md"))).toBe(true);
    expect(assertExpectedArtifacts(r.changeDir, "api").ok).toBe(true);
  }, 240_000);

  it("ui profile 等同 full：init 后 profile=ui 且无 skip", () => {
    const slug = "ui-cli-flow";
    expect(getPhaseOrderForProfile("ui")).toEqual(getPhaseOrderForProfile("full"));

    const init = runForge(REPO, workspace, [
      "init",
      slug,
      "--profile",
      "ui",
      "--title",
      "UI profile smoke",
    ]);
    expect(init.code).toBe(0);

    const state = JSON.parse(
      fs.readFileSync(path.join(workspace, ".taiyi/changes", slug, "state.json"), "utf8"),
    );
    expect(state.profile).toBe("ui");
    expect(state.skippedPhases).toEqual([]);
    expect(getExpectedArtifactsForProfile("ui")).toEqual(getExpectedArtifactsForProfile("full"));
  });
});
