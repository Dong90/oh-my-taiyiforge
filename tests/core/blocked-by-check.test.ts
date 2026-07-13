import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../../src/core/workflow-engine.js";
import { writeE2eArtifacts } from "../../src/core/run-e2e-workflow.js";
import { validateArtifactFile } from "../../src/core/artifact-validator.js";

const QUALITY_GATES = {
  quality: {
    completeness: true,
    consistency: true,
    verifiability: true,
    traceability: true,
    engineering_quality: true,
  },
  human: { approved: true, approver: "test@test.com" },
};

describe("blocked-by-check", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-blk-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("blocks when no state exists for slug", () => {
    const result = engine.completePhase("no-such-slug", "change", QUALITY_GATES);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("blocks when artifact is missing for the phase", () => {
    const slug = "no-artifact";
    engine.initChange(slug);

    // Don't write any artifacts — CHANGE.md won't exist
    const result = engine.completePhase(slug, "change", QUALITY_GATES, {
      skipStepOrderCheck: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Artifact missing/i);
  });

  it("blocks when trying to complete wrong phase", () => {
    const slug = "wrong-phase";
    engine.initChange(slug);

    // currentPhase is "change", try "requirement"
    const result = engine.completePhase(slug, "requirement", QUALITY_GATES);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/change/i);
  });

  it("blocks when workflow already completed", () => {
    const slug = "already-done";
    engine.initChange(slug, { profile: "full" });
    const changeDir = path.join(root, "changes", slug);
    writeE2eArtifacts(changeDir);

    // Complete all phases
    fs.writeFileSync(path.join(changeDir, "health-report.md"), "# Health Report\n\nE2E smoke — no blocking findings.\n", "utf8");
    engine.markAuxiliary(slug, "taiyi-health");
    const phases = [
      "change", "requirement", "design", "ui-design",
      "task", "dev", "test", "review", "integration",
    ] as const;
    for (const phase of phases) {
      const r = engine.completePhase(slug, phase, QUALITY_GATES, {
        allowAutoHuman: true,
        skipStepOrderCheck: true,
        skipArtifactValidation: true,
      });
      expect(r.ok).toBe(true);
    }

    // Try completing integration again
    const again = engine.completePhase(slug, "integration", QUALITY_GATES, {
      allowAutoHuman: true,
      skipStepOrderCheck: true,
      skipArtifactValidation: true,
    });
    expect(again.ok).toBe(false);
    expect(again.error).toMatch(/already completed/i);
  });

  it("blocks when admin used as approver on human-gated phase", () => {
    const slug = "admin-block";
    engine.initChange(slug);
    const changeDir = path.join(root, "changes", slug);
    writeE2eArtifacts(changeDir);

    const adminGates = {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "admin" },
    };

    const result = engine.completePhase(slug, "change", adminGates, {
      skipStepOrderCheck: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Admin|admin/);
  });

  it("validates artifact file returns scores object", () => {
    const slug = "validate-artifact";
    engine.initChange(slug, { profile: "full" });
    const changeDir = path.join(root, "changes", slug);
    writeE2eArtifacts(changeDir);

    const result = validateArtifactFile(
      path.join(changeDir, "CHANGE.md"),
      "change",
    );
    expect(result).toBeDefined();
    expect(result!.scores).toBeDefined();
    expect(typeof result!.scores.completeness).toBe("boolean");
    expect(typeof result!.scores.consistency).toBe("boolean");
  });
});
