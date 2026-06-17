import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { buildPhaseGuide } from "../src/core/phase-guide.js";
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

describe("profile-workflow", () => {
  let root: string;
  let engine: WorkflowEngine;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-profile-"));
    engine = new WorkflowEngine(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("api profile skips ui-design after design", () => {
    engine.initChange("api-feat", { profile: "api" });
    expect(getNextPhase("design", ["ui-design"])).toBe("task");

    const state = engine.getState("api-feat");
    expect(state?.skippedPhases).toContain("ui-design");
    expect(state?.complexity).toBeDefined();
  });

  it("guide includes recommended auxiliary and complexity", () => {
    engine.initChange("guided", { profile: "full" });
    const state = engine.getState("guided")!;
    const guide = buildPhaseGuide(root, "guided", state);
    expect(guide.recommendedAuxiliary).toContain("taiyi-intel-scan");
    expect(guide.complexity?.level).toBeDefined();
  });

  it("medium complexity review requires taiyi-health aux", () => {
    engine.initChange("med", { profile: "full" });
    const dir = path.join(root, "changes", "med");
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify({
      ...engine.getState("med"),
      complexity: {
        level: "medium",
        score: 10,
        recommendedSkills: ["taiyi-health"],
      },
      currentPhase: "review",
      completedPhases: [
        "change",
        "requirement",
        "design",
        "ui-design",
        "task",
        "dev",
        "test",
      ],
    }, null, 2));
    fs.writeFileSync(
      path.join(dir, "REVIEW.md"),
      `# REVIEW\n\n## Summary\nx\n\n## Findings\n| Severity | File | Issue | Suggestion |\n|---|---|---|---|\n\n## Verdict\n- [x] **Approve** — 可合并\n`,
    );
    const r = engine.completePhase("med", "review", GATES, { skipArtifactValidation: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/taiyi-health/);

    fs.writeFileSync(
      path.join(dir, "health-report.md"),
      "# Health\n\nok for medium complexity review gate\n",
      "utf8",
    );
    engine.markAuxiliary("med", "taiyi-health");
    const r2 = engine.completePhase("med", "review", GATES, { skipArtifactValidation: true });
    expect(r2.ok).toBe(true);
  });

  it("high complexity review requires taiyi-health aux", () => {
    engine.initChange("big", { profile: "full" });
    const dir = path.join(root, "changes", "big");
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify({
      ...engine.getState("big"),
      complexity: {
        level: "high",
        score: 20,
        recommendedSkills: ["taiyi-health"],
      },
      currentPhase: "review",
      completedPhases: [
        "change",
        "requirement",
        "design",
        "ui-design",
        "task",
        "dev",
        "test",
      ],
    }, null, 2));
    fs.writeFileSync(
      path.join(dir, "REVIEW.md"),
      `# REVIEW\n\n## Summary\nx\n\n## Findings\n| Severity | File | Issue | Suggestion |\n|---|---|---|---|\n\n## Verdict\n- [x] **Approve** — 可合并\n`,
    );
    const r = engine.completePhase("big", "review", GATES, { skipArtifactValidation: true });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/taiyi-health/);

    fs.writeFileSync(
      path.join(dir, "health-report.md"),
      "# Health\n\nok for high complexity review gate\n",
      "utf8",
    );
    const mark = engine.markAuxiliary("big", "taiyi-health");
    expect(mark.ok, mark.error).toBe(true);
    const r2 = engine.completePhase("big", "review", GATES, { skipArtifactValidation: true });
    expect(r2.ok).toBe(true);
  });

  it("markAuxiliary records skill completion when artifact exists", () => {
    engine.initChange("aux", { profile: "full" });
    const dir = path.join(root, "changes", "aux");
    fs.writeFileSync(path.join(dir, "CONTEXT.md"), "# CONTEXT\n\n## Scan\nok\n", "utf8");
    const mark = engine.markAuxiliary("aux", "taiyi-intel-scan");
    expect(mark.ok, mark.error).toBe(true);
    expect(engine.getState("aux")?.auxiliaryCompleted).toContain("taiyi-intel-scan");
  });

  it("markAuxiliary rejects missing artifact", () => {
    engine.initChange("aux2", { profile: "full" });
    const mark = engine.markAuxiliary("aux2", "taiyi-intel-scan");
    expect(mark.ok).toBe(false);
    expect(mark.error).toMatch(/artifact not ready/i);
  });
});
