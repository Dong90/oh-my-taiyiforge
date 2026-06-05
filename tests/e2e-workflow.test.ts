import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { runE2eWorkflow } from "../src/core/run-e2e-workflow.js";
import { E2E_PHASE_ORDER } from "../src/core/e2e-fixtures.js";

describe("e2e-workflow", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-e2e-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("completes all nine phases with shared fixtures", () => {
    const slug = "e2e-full";
    const result = runE2eWorkflow(engine, slug);
    expect(result.ok).toBe(true);
    expect(result.completed).toEqual(E2E_PHASE_ORDER);

    const state = engine.getState(slug);
    expect(state?.completedPhases).toHaveLength(9);
    expect(state?.completedPhases).toContain("integration");
    expect(state?.workflowStatus).toBe("completed");

    const again = engine.completePhase(slug, "integration", {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "test" },
    });
    expect(again.ok).toBe(false);
    expect(again.error).toMatch(/already completed/i);
  });
});
