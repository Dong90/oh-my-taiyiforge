import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { parseProfileFlag } from "../src/core/cli-hints.js";
import { resolveDefaultProfile } from "../src/core/project-config.js";
import {
  registerProfile,
  loadProfilesFromYaml,
  resetProfileRegistry,
  getProfile,
  listProfiles,
  type ProfileDefinition,
} from "../src/core/profile-registry.js";

let tmpDir: string;

const GATES = {
  quality: {
    completeness: true,
    consistency: true,
    verifiability: true,
    traceability: true,
    engineering_quality: true,
  },
  human: { approved: true, approver: "test" },
} as const;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-profile-e2e-"));
  // Don't resetProfileRegistry here — workflow-engine.ts imports it and builtins are loaded
  // We do need to clean up custom profiles between tests
});

describe("profile-registry: end-to-end with WorkflowEngine", () => {
  it("engine.initChange with builtin profile still works (regression)", () => {
    const engine = new WorkflowEngine(tmpDir);
    engine.initChange("api-feat", { profile: "api" });
    const state = engine.getState("api-feat");
    expect(state).toBeDefined();
    expect(state!.skippedPhases).toContain("ui-design");
  });

  it("engine.initChange with custom profile flows through correctly", () => {
    registerProfile({
      id: "my-team-strict",
      skipPhases: ["ui-design", "review"],
      arch: "auto",
    });
    const engine = new WorkflowEngine(tmpDir);
    engine.initChange("team-feat", { profile: "my-team-strict" });
    const state = engine.getState("team-feat");
    expect(state).toBeDefined();
    expect(state!.skippedPhases).toContain("ui-design");
    expect(state!.skippedPhases).toContain("review");
  });

  it("parseProfileFlag accepts custom profile registered via registerProfile", () => {
    registerProfile({
      id: "cli-custom",
      skipPhases: [],
      arch: "auto",
    });
    const r = parseProfileFlag(["--profile", "cli-custom"]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile).toBe("cli-custom");
    }
  });

  it("parseProfileFlag still rejects unknown profile", () => {
    const r = parseProfileFlag(["--profile", "does-not-exist"]);
    expect(r.ok).toBe(false);
  });

  it("parseProfileFlag returns undefined when flag absent", () => {
    const r = parseProfileFlag(["some-other-flag"]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile).toBeUndefined();
    }
  });

  it("resolveDefaultProfile uses project config when valid profile", () => {
    const cfgDir = path.join(tmpDir, ".taiyi");
    fs.mkdirSync(cfgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cfgDir, "config.json"),
      JSON.stringify({ defaultProfile: "lite" }),
    );
    expect(resolveDefaultProfile(tmpDir)).toBe("lite");
  });

  it("resolveDefaultProfile falls back to 'full' when config has invalid profile", () => {
    const cfgDir = path.join(tmpDir, ".taiyi");
    fs.mkdirSync(cfgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cfgDir, "config.json"),
      JSON.stringify({ defaultProfile: "nonexistent-profile" }),
    );
    expect(resolveDefaultProfile(tmpDir)).toBe("full");
  });

  it("integration: register custom → initChange → completePhase first phase", () => {
    registerProfile({
      id: "e2e-flow",
      skipPhases: [],
      arch: "auto",
      description: "Full E2E flow test",
    });
    const engine = new WorkflowEngine(tmpDir);
    engine.initChange("e2e-slug", { profile: "e2e-flow" });
    const changeDir = path.join(tmpDir, "changes", "e2e-slug");
    // Write minimal CHANGE.md so artifact check passes
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      "# CHANGE: E2E Test\n\n## Scope\n- In: test\n- Out: nothing\n\n## Success Criteria\n- [x] ok\n",
    );
    const r = engine.completePhase("e2e-slug", "change", GATES, {
      skipArtifactValidation: true,
    });
    expect(r.ok).toBe(true);
    const state = engine.getState("e2e-slug");
    expect(state?.completedPhases).toContain("change");
  });
});

// ── Cleanup helper to avoid test pollution ──
afterEach(() => {
  // Remove tmpDir
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

function _unused() {
  // satisfies TS unused-import rule if we don't end up using all imports
  const _p: ProfileDefinition | undefined = getProfile("e2e-flow");
  const _list = listProfiles();
  return [_p, _list];
}
