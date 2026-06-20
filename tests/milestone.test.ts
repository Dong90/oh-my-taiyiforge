import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { queryMilestone } from "../src/core/milestone-query.js";

function writeChange(taiyiRoot: string, slug: string, overrides: Record<string, unknown> = {}) {
  const dir = path.join(taiyiRoot, "changes", slug);
  fs.mkdirSync(dir, { recursive: true });
  const state = {
    slug,
    currentPhase: "change",
    completedPhases: [] as string[],
    workflowStatus: "active",
    profile: "full",
    skippedPhases: [],
    strictDev: false,
    autoHarness: false,
    complexity: { level: "low", score: 2, recommendedSkills: [] },
    auxiliaryCompleted: [],
    createdAt: "2026-06-19T08:00:00.000Z",
    updatedAt: "2026-06-19T10:00:00.000Z",
    ...overrides,
  };
  fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify(state, null, 2));
  return dir;
}

function writeChangeMd(dir: string, title: string) {
  fs.writeFileSync(path.join(dir, "CHANGE.md"), `# CHANGE: ${title}\n\n## Motivation\n\nTest\n`);
}

function writeArchive(taiyiRoot: string, slug: string, overrides: Record<string, unknown> = {}) {
  const archiveDir = path.join(taiyiRoot, "archive", slug);
  fs.mkdirSync(archiveDir, { recursive: true });
  const state = {
    slug,
    currentPhase: "integration" as const,
    completedPhases: ["change", "requirement", "design", "ui-design", "task", "dev", "test", "review", "integration"],
    workflowStatus: "completed" as const,
    profile: "full",
    skippedPhases: [],
    strictDev: false,
    autoHarness: false,
    complexity: { level: "medium", score: 6, recommendedSkills: [] },
    auxiliaryCompleted: [],
    createdAt: "2026-06-17T08:00:00.000Z",
    updatedAt: "2026-06-18T08:00:00.000Z",
    ...overrides,
  };
  fs.writeFileSync(path.join(archiveDir, "state.json"), JSON.stringify(state, null, 2));
}

describe("queryMilestone", () => {
  let taiyiRoot: string;

  beforeEach(() => {
    taiyiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-milestone-"));
  });

  afterEach(() => {
    fs.rmSync(taiyiRoot, { recursive: true, force: true });
  });

  it("returns empty report when no changes exist", () => {
    const report = queryMilestone(taiyiRoot);
    expect(report.totalChanges).toBe(0);
    expect(report.activeChanges).toBe(0);
    expect(report.changes).toHaveLength(0);
    expect(report.completionPercent).toBe(0);
  });

  it("aggregates a single active change correctly", () => {
    const dir = writeChange(taiyiRoot, "login", {
      currentPhase: "design",
      completedPhases: ["change", "requirement"],
      profile: "full",
      complexity: { level: "low", score: 3, recommendedSkills: [] },
    });
    writeChangeMd(dir, "用户登录");

    const report = queryMilestone(taiyiRoot);
    expect(report.totalChanges).toBe(1);
    expect(report.activeChanges).toBe(1);
    expect(report.completedChanges).toBe(0);
    expect(report.changes[0].slug).toBe("login");
    expect(report.changes[0].title).toBe("用户登录");
    expect(report.changes[0].currentPhase).toBe("design");
    expect(report.changes[0].currentPhaseOrder).toBe(3);
    expect(report.changes[0].totalPhases).toBe(9);
    expect(report.changes[0].completedPhases).toEqual(["change", "requirement"]);
    expect(report.changes[0].isCompleted).toBe(false);
    expect(report.changes[0].isAborted).toBe(false);
  });

  it("aggregates multiple changes at various phases", () => {
    // login — at design (2/9 completed)
    const d1 = writeChange(taiyiRoot, "login", {
      currentPhase: "design",
      completedPhases: ["change", "requirement"],
      complexity: { level: "low", score: 3, recommendedSkills: [] },
    });
    writeChangeMd(d1, "用户登录");

    // payment — at dev (5/9 completed)
    const d2 = writeChange(taiyiRoot, "payment", {
      currentPhase: "dev",
      completedPhases: ["change", "requirement", "design", "ui-design", "task"],
      profile: "full",
      complexity: { level: "high", score: 8, recommendedSkills: ["taiyi-health"] },
    });
    writeChangeMd(d2, "支付模块");

    // search — just started (change, 0/9 completed)
    const d3 = writeChange(taiyiRoot, "search", {
      currentPhase: "change",
      completedPhases: [],
      complexity: { level: "low", score: 1, recommendedSkills: [] },
    });

    const report = queryMilestone(taiyiRoot);
    expect(report.totalChanges).toBe(3);
    expect(report.activeChanges).toBe(3);
    expect(report.totalCompletedPhases).toBe(7); // 2 + 5 + 0
    expect(report.totalPossiblePhases).toBe(27); // 9 * 3
    // 7/27 = 25.9%, but we do Math.round so 26
    expect(report.completionPercent).toBe(26);

    // phase distribution: change=1, dev=1, design=1
    expect(report.phaseDistribution).toEqual({
      change: 1,
      dev: 1,
      design: 1,
    });
  });

  it("correctly identifies bottleneck phase", () => {
    writeChange(taiyiRoot, "a", { currentPhase: "design", completedPhases: ["change", "requirement"] });
    writeChange(taiyiRoot, "b", { currentPhase: "design", completedPhases: ["change", "requirement"] });
    writeChange(taiyiRoot, "c", { currentPhase: "dev", completedPhases: ["change", "requirement", "design", "ui-design", "task"] });
    writeChange(taiyiRoot, "d", { currentPhase: "change", completedPhases: [] });

    const report = queryMilestone(taiyiRoot);
    expect(report.bottleneckPhase).not.toBeNull();
    expect(report.bottleneckPhase!.phaseId).toBe("design");
    expect(report.bottleneckPhase!.count).toBe(2);
    expect(report.bottleneckPhase!.slugs).toEqual(["a", "b"]);
  });

  it("includes completed changes when includeArchived is true", () => {
    writeChange(taiyiRoot, "active-1", { currentPhase: "dev", completedPhases: ["change", "requirement", "design", "ui-design", "task"] });
    writeArchive(taiyiRoot, "done-v1");

    // Without archived
    const r1 = queryMilestone(taiyiRoot);
    expect(r1.totalChanges).toBe(1);
    expect(r1.activeChanges).toBe(1);
    expect(r1.completedChanges).toBe(0);

    // With archived
    const r2 = queryMilestone(taiyiRoot, { includeArchived: true });
    expect(r2.totalChanges).toBe(2);
    expect(r2.activeChanges).toBe(1);
    expect(r2.completedChanges).toBe(1);
    expect(r2.changes.find((c) => c.isCompleted)).toBeDefined();
  });

  it("handles aborted changes", () => {
    writeChange(taiyiRoot, "active-1", { currentPhase: "dev", completedPhases: ["change", "requirement", "design", "ui-design", "task"] });
    writeChange(taiyiRoot, "aborted-1", {
      workflowStatus: "aborted",
      currentPhase: "change",
      completedPhases: [],
    });

    const report = queryMilestone(taiyiRoot);
    expect(report.totalChanges).toBe(2);
    expect(report.activeChanges).toBe(1);
    expect(report.abortedChanges).toBe(1);

    const aborted = report.changes.find((c) => c.isAborted);
    expect(aborted).toBeDefined();
    expect(aborted!.currentPhase).toBe("aborted");
  });

  it("handles lite profile (skipped phases)", () => {
    writeChange(taiyiRoot, "lite-change", {
      currentPhase: "dev",
      completedPhases: ["change", "requirement"],
      profile: "lite",
      skippedPhases: ["design", "ui-design", "task", "review"],
    });

    const report = queryMilestone(taiyiRoot);
    expect(report.totalChanges).toBe(1);
    expect(report.changes[0].totalPhases).toBe(5); // 9 - 4 skipped
    expect(report.totalPossiblePhases).toBe(5);
  });

  it("falls back to slug as title when CHANGE.md missing", () => {
    writeChange(taiyiRoot, "no-title-file", { currentPhase: "change", completedPhases: [] });

    const report = queryMilestone(taiyiRoot);
    expect(report.changes[0].title).toBe("no-title-file");
  });
});
