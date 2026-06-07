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

  it("rejects unknown auxiliary skill in markAuxiliary", () => {
    engine.initChange("aux-demo");
    const result = engine.markAuxiliary("aux-demo", "taiyi-not-real");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unknown auxiliary skill/);
  });

  it("rejects markAuxiliary without artifact", () => {
    engine.initChange("aux-no-file");
    const result = engine.markAuxiliary("aux-no-file", "taiyi-intel-scan");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/artifact not ready/i);
  });

  it("rejects invalid slug on init", () => {
    expect(() => engine.initChange("../bad")).toThrow(/invalid slug|slug must match/i);
  });

  it("rejects re-init without force", () => {
    engine.initChange("once");
    expect(() => engine.initChange("once")).toThrow(/already exists/);
  });

  it("force reinit clears artifacts and resets progress", () => {
    engine.initChange("force-demo");
    const dir = path.join(root, "changes", "force-demo");
    fs.writeFileSync(path.join(dir, "REQUIREMENT.md"), "# REQ\n\nfuture artifact\n", "utf8");
    fs.writeFileSync(path.join(dir, "CONTEXT.md"), "# CONTEXT\n\naux\n", "utf8");
    fs.writeFileSync(
      path.join(dir, "state.json"),
      JSON.stringify(
        {
          ...engine.getState("force-demo"),
          currentPhase: "requirement",
          completedPhases: ["change"],
        },
        null,
        2,
      ),
      "utf8",
    );

    engine.initChange("force-demo", { force: true });
    expect(fs.existsSync(path.join(dir, "REQUIREMENT.md"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "CONTEXT.md"))).toBe(false);
    expect(engine.getState("force-demo")?.currentPhase).toBe("change");
    expect(engine.getState("force-demo")?.completedPhases).toEqual([]);
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

  it("abortChange marks workflowStatus aborted", () => {
    engine.initChange("to-cancel");
    const r = engine.abortChange("to-cancel");
    expect(r.ok).toBe(true);
    expect(engine.getState("to-cancel")?.workflowStatus).toBe("aborted");
  });

  it("completePhase rejects aborted change", () => {
    engine.initChange("aborted");
    engine.abortChange("aborted");
    const result = engine.completePhase("aborted", "change", {
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
    expect(result.error).toMatch(/aborted/i);
  });
});
