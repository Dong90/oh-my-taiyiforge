import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";

describe("workflow-engine", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("creates a change with initial phase change", () => {
    const state = engine.initChange("demo-feature");
    expect(state.slug).toBe("demo-feature");
    expect(state.currentPhase).toBe("change");
    expect(state.completedPhases).toEqual([]);
    expect(state.seeded).toEqual([]);
  });

  it("seeds templates when templatesDir provided", () => {
    const templates = path.join(root, "templates");
    fs.mkdirSync(templates);
    fs.writeFileSync(
      path.join(templates, "CHANGE.md"),
      "# CHANGE: {{title}}\n\n## Motivation\nseed\n\n## Scope\nx\n\n## Success Criteria\n- [ ] ok\n",
    );
    const eng = new WorkflowEngine(root, templates);
    const result = eng.initChange("seeded", { title: "Seeded Feature" });
    expect(result.seeded).toContain("CHANGE.md");
    expect(fs.existsSync(path.join(root, "changes", "seeded", "CHANGE.md"))).toBe(true);
  });

  it("rejects completePhase when CHANGE.md is still template-quality", () => {
    const templates = path.join(root, "templates");
    fs.mkdirSync(templates);
    fs.writeFileSync(path.join(templates, "CHANGE.md"), "# CHANGE: {{title}}\n\n## Motivation\n\n## Scope\n\n## Success Criteria\n");
    const eng = new WorkflowEngine(root, templates);
    eng.initChange("bad-change", { templatesDir: templates });
    const result = eng.completePhase("bad-change", "change", {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "human" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Quality gate failed/);
  });

  it("rejects completePhase without artifact file", () => {
    engine.initChange("demo-feature");
    const result = engine.completePhase("demo-feature", "change", {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "human" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/artifact/i);
  });

  it("advances to next phase when gates pass and artifact exists", () => {
    engine.initChange("demo-feature");
    const changeDir = path.join(root, "changes", "demo-feature");
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# Change

## Motivation
Demo motivation with enough detail for validation.

## Scope
- In: demo

## Success Criteria
- [ ] Demo passes validation
`,
    );
    const result = engine.completePhase("demo-feature", "change", {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "human" },
    });
    expect(result.ok).toBe(true);
    const state = engine.getState("demo-feature");
    expect(state?.completedPhases).toContain("change");
    expect(state?.currentPhase).toBe("requirement");
  });

  it("assesses complexity from artifact count", () => {
    engine.initChange("big-change");
    const { assessment } = engine.assessComplexity("big-change", {
      touchedModules: 12,
      hasUi: true,
      testLevels: 4,
    });
    expect(["low", "medium", "high"]).toContain(assessment.level);
    expect(assessment.recommendedSkills).toContain("taiyi-architect");
  });
});
