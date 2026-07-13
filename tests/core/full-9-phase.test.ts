import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../../src/core/workflow-engine.js";
import { writeE2eArtifacts } from "../../src/core/run-e2e-workflow.js";
import { E2E_PHASE_ORDER } from "../../src/core/e2e-fixtures.js";

const QUALITY_GATES = {
  quality: {
    completeness: true,
    consistency: true,
    verifiability: true,
    traceability: true,
    engineering_quality: true,
  },
  human: { approved: true, approver: "e2e-test" },
};

describe("full-9-phase", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-9p-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("walks through all 9 phases in order and completes workflow", () => {
    const slug = "full-9p";
    engine.initChange(slug, { profile: "full" });

    // Pre-seed all artifacts
    const changeDir = path.join(root, "changes", slug);
    writeE2eArtifacts(changeDir);
    fs.writeFileSync(path.join(changeDir, "health-report.md"), "# Health Report\n\nE2E smoke — no blocking findings.\n", "utf8");
    engine.markAuxiliary(slug, "taiyi-health");

    // Walk through each phase in order
    for (let i = 0; i < E2E_PHASE_ORDER.length; i++) {
      const phase = E2E_PHASE_ORDER[i];
      const state = engine.getState(slug);
      expect(state?.currentPhase).toBe(phase);

      const result = engine.completePhase(slug, phase, QUALITY_GATES, {
        allowAutoHuman: true,
        skipStepOrderCheck: true,
        skipArtifactValidation: true,
      });
      if (!result.ok) {
        console.log(`PHASE ${phase} FAILED: ${result.error}`);
        console.log(`FIXHINTS: ${JSON.stringify(result.fixHints)}`);
      }
      expect(result.ok).toBe(true);

      if (i < E2E_PHASE_ORDER.length - 1) {
        const updatedState = engine.getState(slug);
        expect(updatedState?.completedPhases).toContain(phase);
      }
    }

    // Final state assertions
    const finalState = engine.getState(slug);
    expect(finalState?.completedPhases).toHaveLength(9);
    expect(finalState?.completedPhases).toEqual(E2E_PHASE_ORDER);
    expect(finalState?.workflowStatus).toBe("completed");
  });

  it("rejects duplicate completePhase after workflow completed", () => {
    const slug = "dup-done";
    engine.initChange(slug, { profile: "full" });
    const changeDir = path.join(root, "changes", slug);
    writeE2eArtifacts(changeDir);

    // Complete all 9 phases
    fs.writeFileSync(path.join(changeDir, "health-report.md"), "# Health Report\n\nE2E smoke — no blocking findings.\n", "utf8");
    engine.markAuxiliary(slug, "taiyi-health");
    for (const phase of E2E_PHASE_ORDER) {
      const result = engine.completePhase(slug, phase, QUALITY_GATES, {
        allowAutoHuman: true,
        skipStepOrderCheck: true,
        skipArtifactValidation: true,
      });
      expect(result.ok).toBe(true);
    }

    // Try to complete again
    const dup = engine.completePhase(slug, "integration", QUALITY_GATES, {
      allowAutoHuman: true,
      skipStepOrderCheck: true,
      skipArtifactValidation: true,
    });
    expect(dup.ok).toBe(false);
    expect(dup.error).toMatch(/already completed/i);
  });

  it("rejects wrong phase order when skipStepOrderCheck is off", () => {
    const slug = "wrong-order";
    engine.initChange(slug, { profile: "full" });
    const changeDir = path.join(root, "changes", slug);
    writeE2eArtifacts(changeDir);

    // Try to complete "requirement" before "change"
    const result = engine.completePhase(slug, "requirement", QUALITY_GATES, {
      allowAutoHuman: true,
      skipArtifactValidation: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/change/i);
  });

  it("rejects unknown slug", () => {
    const result = engine.completePhase("nonexistent", "change", QUALITY_GATES);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
