import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { activateMode, readModeState } from "../src/core/runtime/mode-state.js";
import {
  listOrphanRuntimeModes,
  pruneOrphanRuntimeModes,
  clearRuntimeForSlug,
} from "../src/core/runtime/orphan-runtime.js";
import { runModeStep } from "../src/core/runtime/mode-orchestrator.js";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { resolveTemplatesDir } from "../src/core/package-root.js";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatesDir = resolveTemplatesDir(import.meta.url);

describe("orphan runtime modes", () => {
  let taiyiRoot: string;
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-orphan-rt-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "runtime"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("lists and prunes modes pointing at missing slug", () => {
    activateMode(taiyiRoot, "deep-interview", "ten-r1-lite");
    activateMode(taiyiRoot, "visual-verdict", "ten-r1-lite");
    activateMode(taiyiRoot, "ai-slop-cleaner", "ten-r1-lite");

    const orphans = listOrphanRuntimeModes(taiyiRoot);
    expect(orphans).toHaveLength(3);
    expect(orphans.every((o) => o.slug === "ten-r1-lite")).toBe(true);

    const cleared = pruneOrphanRuntimeModes(taiyiRoot);
    expect(cleared).toHaveLength(3);
    expect(listOrphanRuntimeModes(taiyiRoot)).toHaveLength(0);
    expect(readModeState(taiyiRoot, "deep-interview")).toBeNull();
  });

  it("step on missing slug clears orphan runtime for that slug", () => {
    activateMode(taiyiRoot, "deep-interview", "ten-r1-lite");
    const engine = new WorkflowEngine(taiyiRoot, templatesDir);

    const step = runModeStep(engine, workspace, taiyiRoot, "ten-r1-lite");
    expect(step.ok).toBe(false);
    expect(step.text).toMatch(/Change not found/);
    expect(step.text).toMatch(/已清除.*deep-interview/);
    expect(readModeState(taiyiRoot, "deep-interview")).toBeNull();
  });

  it("step on archived completed slug exits 0", () => {
    const slug = "lite-done";
    const archiveDir = path.join(taiyiRoot, "archive", slug);
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(
      path.join(archiveDir, "state.json"),
      JSON.stringify({
        slug,
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
        autoHarness: false,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      }),
    );
    activateMode(taiyiRoot, "deep-interview", slug);
    const engine = new WorkflowEngine(taiyiRoot, templatesDir);
    const step = runModeStep(engine, workspace, taiyiRoot, slug);
    expect(step.ok).toBe(true);
    expect(step.exitCode).toBe(0);
    expect(step.text).toMatch(/归档|已完成/);
  });

  it("init --force clears runtime for slug", () => {
    activateMode(taiyiRoot, "autopilot", "ten-r1-lite", { preserveOnDeactivate: true });
    const engine = new WorkflowEngine(taiyiRoot, templatesDir);
    engine.initChange("ten-r1-lite", {
      title: "Ten round R1",
      profile: "lite",
      force: true,
      templatesDir,
    });
    expect(readModeState(taiyiRoot, "autopilot")).toBeNull();
    expect(clearRuntimeForSlug(taiyiRoot, "ten-r1-lite")).toHaveLength(0);
  });
});
