import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import {
  taiyiComplete,
  taiyiHarnessCheck,
  taiyiToken,
} from "../src/plugin/handlers.js";
import { resolveHumanForComplete, allowAutoHumanEnv } from "../src/core/gates/human-gate-config.js";
import { installResultsExitCode } from "../src/install/run.js";
import { validateArtifactContent } from "../src/core/artifact-validator.js";

describe("review fixes F11-F26", () => {
  let root: string;
  let workspace: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-rf-"));
    workspace = root;
    engine = new WorkflowEngine(path.join(root, ".taiyi"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("rejects initChange when slug already exists", () => {
    engine.initChange("dup");
    expect(() => engine.initChange("dup")).toThrow(/already exists/);
    expect(() => engine.initChange("dup", { force: true })).not.toThrow();
  });

  it("lookupState reports corrupt state.json", () => {
    engine.initChange("corrupt");
    const stateFile = path.join(root, ".taiyi", "changes", "corrupt", "state.json");
    fs.writeFileSync(stateFile, "{ not-json", "utf8");
    const lookup = engine.lookupState("corrupt");
    expect(lookup.status).toBe("corrupt");
  });

  it("taiyiComplete rejects unknown phase without throw", () => {
    engine.initChange("x1");
    const r = taiyiComplete(workspace, "x1", "not-a-phase");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unknown phase/);
  });

  it("taiyiComplete honors TAIYI_AUTO_HUMAN for change phase", () => {
    const prev = process.env.TAIYI_AUTO_HUMAN;
    process.env.TAIYI_AUTO_HUMAN = "1";
    try {
      engine.initChange("auto-h");
      const changeDir = path.join(root, ".taiyi", "changes", "auto-h");
      fs.writeFileSync(
        path.join(changeDir, "CHANGE.md"),
        `# CHANGE: Auto H\n\n## Motivation\nNeed auto human gate in CI.\n\n## Scope\n- In: test\n\n## Success Criteria\n- [ ] pass\n`,
      );
      const r = taiyiComplete(workspace, "auto-h", "change");
      expect(r.ok).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.TAIYI_AUTO_HUMAN;
      else process.env.TAIYI_AUTO_HUMAN = prev;
    }
  });

  it("taiyiHarnessCheck rejects unknown hook key", () => {
    engine.initChange("hk");
    const r = taiyiHarnessCheck(workspace, "hk", "not-a-real-hook");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unknown harness hook/);
  });

  it("taiyiToken status resolves active slug without crash", () => {
    engine.initChange("tok-a");
    const r = taiyiToken(workspace, "status");
    expect(r.ok).toBe(true);
    expect("text" in r && r.text).toMatch(/Token:/);
    const explicit = taiyiToken(workspace, "status", { slug: "tok-a" });
    expect(explicit.ok).toBe(true);
  });

  it("resolveHumanForComplete blocks without approver when auto human off", () => {
    const prev = process.env.TAIYI_AUTO_HUMAN;
    delete process.env.TAIYI_AUTO_HUMAN;
    try {
      const r = resolveHumanForComplete("change", undefined);
      expect(r.ok).toBe(false);
      expect(allowAutoHumanEnv({ TAIYI_AUTO_HUMAN: "1" })).toBe(true);
    } finally {
      if (prev !== undefined) process.env.TAIYI_AUTO_HUMAN = prev;
    }
  });

  it("dev artifact validator requires command and exitCode evidence", () => {
    const weak = validateArtifactContent("dev", "ok");
    expect(weak.scores.completeness).toBe(false);
    const strong = validateArtifactContent(
      "dev",
      "command: npm test\nexitCode: 0\ndev complete: shipped feature X\n",
    );
    expect(strong.scores.completeness).toBe(true);
  });

  it("installResultsExitCode returns 1 when any step failed", () => {
    expect(installResultsExitCode([{ target: "cursor", path: "/x", action: "updated" }])).toBe(0);
    expect(
      installResultsExitCode([
        { target: "cursor", path: "/x", action: "updated" },
        { target: "opencode", path: "/y", action: "failed", detail: "npm error" },
      ]),
    ).toBe(1);
  });
});
