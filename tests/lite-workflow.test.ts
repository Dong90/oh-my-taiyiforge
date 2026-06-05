import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
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

describe("lite-workflow", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-lite-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("lite profile skips design/ui-design/task/review", () => {
    engine.initChange("lite-fix", { profile: "lite" });
    const state = engine.getState("lite-fix");
    expect(state?.skippedPhases).toEqual(
      expect.arrayContaining(["design", "ui-design", "task", "review"]),
    );
    expect(getNextPhase("requirement", state!.skippedPhases)).toBe("dev");
  });

  it("completes lite path in five phases", () => {
    engine.initChange("lite-fix", { profile: "lite" });
    const dir = path.join(root, "changes", "lite-fix");

    fs.writeFileSync(
      path.join(dir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nFix bug.\n\n## Scope\n- In: x\n\n## Success Criteria\n- [ ] fixed\n`,
    );
    expect(engine.completePhase("lite-fix", "change", GATES).ok).toBe(true);

    fs.writeFileSync(
      path.join(dir, "REQUIREMENT.md"),
      `# REQ\n\n## User Stories\n| ID | As | Want | So |\n|---|---|---|---|\n| US-1 | u | fix | ok |\n\n## Acceptance Criteria\n**Given** x **When** y **Then** z\n\n## Traceability\n| AC | CHANGE |\n|---|---|\n| 1 | SC |\n`,
    );
    expect(engine.completePhase("lite-fix", "requirement", GATES).ok).toBe(true);

    fs.writeFileSync(path.join(dir, ".dev-complete"), "done\n");
    expect(engine.completePhase("lite-fix", "dev", GATES).ok).toBe(true);

    fs.writeFileSync(
      path.join(dir, "TEST.md"),
      `# TEST\n\n## Test Plan\nRun npm test.\n\n## Execution\n| cmd | code |\n|---|---|\n| npm test | 0 |\n`,
    );
    expect(engine.completePhase("lite-fix", "test", GATES).ok).toBe(true);

    fs.writeFileSync(
      path.join(dir, "CHANGELOG.md"),
      `# CHANGELOG: lite-fix\n\n## Added\n- Fixed regression in export path (user-visible).\n\n## Rollback\nRevert commit abc.\n`,
    );
    const last = engine.completePhase("lite-fix", "integration", GATES);
    expect(last.ok, last.error).toBe(true);

    const final = engine.getState("lite-fix");
    expect(final?.completedPhases).toHaveLength(5);
    expect(final?.completedPhases).not.toContain("design");
  });
});
