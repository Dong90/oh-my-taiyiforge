import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { DEV_COMPLETE_EVIDENCE } from "../src/core/dev-complete.js";
import { getNextPhase } from "../src/core/phase-registry.js";

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

describe("spike-workflow", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-spike-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("spike profile skips planning and review phases", () => {
    engine.initChange("mvp-x", { profile: "spike" });
    const state = engine.getState("mvp-x");
    expect(state?.skippedPhases).toEqual(
      expect.arrayContaining(["requirement", "design", "ui-design", "task", "review"]),
    );
    expect(getNextPhase("change", state!.skippedPhases)).toBe("dev");
  });

  it("completes spike path in four phases", () => {
    engine.initChange("mvp-x", { profile: "spike" });
    const dir = path.join(root, "changes", "mvp-x");

    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nShip MVP.\n\n## Scope\n- In: onboarding\n\n## Success Criteria\n- [ ] user can sign up\n`,
    );
    expect(engine.completePhase("mvp-x", "change", GATES).ok).toBe(true);

    fs.writeFileSync(path.join(dir, ".dev-complete"), DEV_COMPLETE_EVIDENCE);
    expect(engine.completePhase("mvp-x", "dev", GATES).ok).toBe(true);

    fs.writeFileSync(
      path.join(dir, "TEST.md"),
      `# TEST\n\n## Test Plan\nRun npm test.\n\n## Execution\n| cmd | code |\n|---|---|\n| npm test | 0 |\n`,
    );
    expect(engine.completePhase("mvp-x", "test", GATES).ok).toBe(true);

    fs.writeFileSync(
      path.join(dir, "CHANGELOG.md"),
      `# CHANGELOG: mvp-x\n\n## Added\n- MVP onboarding flow (user-visible).\n\n## Rollback\nRevert commit abc.\n`,
    );
    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nShip MVP.\n\n## Scope\n- In: onboarding\n\n## Success Criteria\n- [x] user can sign up\n`,
    );
    expect(engine.completePhase("mvp-x", "integration", GATES).ok).toBe(true);

    const final = engine.getState("mvp-x");
    expect(final?.completedPhases).toHaveLength(4);
  });
});

describe("micro-workflow", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-micro-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("micro profile is three-phase path", () => {
    engine.initChange("tool-x", { profile: "micro" });
    const state = engine.getState("tool-x");
    expect(state?.skippedPhases).toEqual(
      expect.arrayContaining(["requirement", "test", "review"]),
    );
    expect(getNextPhase("dev", state!.skippedPhases)).toBe("integration");
  });

  it("completes micro path without TEST.md", () => {
    engine.initChange("tool-x", { profile: "micro" });
    const dir = path.join(root, "changes", "tool-x");

    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nCLI helper.\n\n## Scope\n- In: fmt\n\n## Success Criteria\n- [ ] works\n`,
    );
    expect(engine.completePhase("tool-x", "change", GATES).ok).toBe(true);

    fs.writeFileSync(path.join(dir, ".dev-complete"), DEV_COMPLETE_EVIDENCE);
    expect(engine.completePhase("tool-x", "dev", GATES).ok).toBe(true);

    fs.writeFileSync(
      path.join(dir, "CHANGELOG.md"),
      `# CHANGELOG: tool-x\n\n## Added\n- fmt helper for local scripts (user-visible).\n\n## Rollback\nRevert commit abc.\n`,
    );
    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nCLI helper.\n\n## Scope\n- In: fmt\n\n## Success Criteria\n- [x] works\n`,
    );
    expect(engine.completePhase("tool-x", "integration", GATES).ok).toBe(true);

    const final = engine.getState("tool-x");
    expect(final?.completedPhases).toHaveLength(3);
    expect(final?.completedPhases).not.toContain("test");
  });
});
