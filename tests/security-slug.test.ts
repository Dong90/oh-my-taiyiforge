import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveActiveSlug } from "../src/core/active-slug.js";
import { taiyiStateRead } from "../src/mcp/state-tools.js";
import { cancelRuntimeModes } from "../src/core/runtime/cancel-mode.js";
import { activateMode, readModeState } from "../src/core/runtime/mode-state.js";
import { ensureTeamMode, bumpTeamFixRound, readTeamState } from "../src/core/runtime/team-state.js";
import { runModeStep } from "../src/core/runtime/mode-orchestrator.js";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { resolveTemplatesDir } from "../src/core/package-root.js";

describe("slug security and runtime fixes", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sec-"));
    taiyiRoot = path.join(workspace, ".taiyi");
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("resolveActiveSlug rejects path traversal", () => {
    const r = resolveActiveSlug(taiyiRoot, "../../../etc/passwd");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("invalid slug");
  });

  it("taiyiStateRead rejects path traversal slug", () => {
    const r = taiyiStateRead(workspace, "../escape");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/invalid slug/i);
  });

  it("cancelRuntimeModes idle when nothing active", () => {
    const r = cancelRuntimeModes(taiyiRoot);
    expect(r.idle).toBe(true);
    expect(r.cancelled).toEqual([]);
  });

  it("cancel ralph clears linked ultrawork for same slug", () => {
    activateMode(taiyiRoot, "ralph", "demo");
    activateMode(taiyiRoot, "ultrawork", "demo", { linkedModes: ["ralph"] });
    expect(readModeState(taiyiRoot, "ultrawork")?.active).toBe(true);

    cancelRuntimeModes(taiyiRoot, { slug: "demo" });
    expect(readModeState(taiyiRoot, "ultrawork")?.active).toBeFalsy();
  });

  it("ensureTeamMode preserves fixRound on repeat calls", () => {
    ensureTeamMode(taiyiRoot, "demo", "dev");
    bumpTeamFixRound(taiyiRoot);
    const mid = readTeamState(taiyiRoot);
    expect(mid?.fixRound).toBe(1);

    ensureTeamMode(taiyiRoot, "demo", "dev");
    const after = readTeamState(taiyiRoot);
    expect(after?.fixRound).toBe(1);
    expect(after?.stage).toBe("fix");
  });

  it("ultrawork step in wrong phase does not activate ultrawork", () => {
    const engine = new WorkflowEngine(taiyiRoot, resolveTemplatesDir(import.meta.url));
    engine.initChange("ulw-block", { profile: "lite" });
    const r = runModeStep(engine, workspace, taiyiRoot, "ulw-block", "ultrawork");
    expect(r.ok).toBe(false);
    expect(readModeState(taiyiRoot, "ultrawork")?.active).toBeFalsy();
  });
});
