import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { auditWorkspace, crossChangeFindings } from "../src/core/workflow-audit.js";

describe("workflow-audit", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-audit-ws-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    const changeDir = path.join(taiyiRoot, "changes", "demo");
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, "state.json"),
      JSON.stringify(
        {
          slug: "demo",
          currentPhase: "complete",
          complexity: "medium",
          completedPhases: ["change", "requirement", "design", "ui-design", "task", "dev", "test", "review", "integration"],
          profile: "full",
          skippedPhases: [],
          strictDev: false,
          auxiliaryCompleted: [],
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# CHANGE\n\n## Motivation\nx\n\n## Scope\nin\n\n## Success Criteria\n- [ ] not done\n`,
    );
    fs.writeFileSync(
      path.join(changeDir, "CHANGELOG.md"),
      `# CHANGELOG\n\n## Added\n- feat\n\n## Success Criteria Met\n✅ all good\n`,
    );
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("flags legacy state and CHANGE/CHANGELOG drift", () => {
    const r = auditWorkspace(workspace, taiyiRoot, { slug: "demo" });
    expect(r.ok).toBe(false);
    const codes = r.changes[0]?.findings.map((f) => f.code) ?? [];
    expect(codes).toContain("state.legacy-phase");
    expect(codes).toContain("state.legacy-complexity");
    expect(codes).toContain("ac.change-changelog-drift");
  });

  it("flags ahead-of-phase artifacts", () => {
    const changeDir = path.join(taiyiRoot, "changes", "ahead");
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, "state.json"),
      JSON.stringify(
        {
          slug: "ahead",
          currentPhase: "change",
          completedPhases: [],
          profile: "full",
          skippedPhases: [],
          strictDev: false,
          auxiliaryCompleted: [],
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      "# REQUIREMENT\n\n## User Stories\n- story\n",
      "utf8",
    );

    const r = auditWorkspace(workspace, taiyiRoot, { slug: "ahead" });
    const codes = r.changes[0]?.findings.map((f) => f.code) ?? [];
    expect(codes).toContain("artifacts.ahead-of-phase");
  });
});

describe("crossChangeFindings", () => {
  let workspace: string;
  let taiyiRoot: string;

  function makeChange(slug: string, overrides: Record<string, unknown> = {}) {
    const dir = path.join(taiyiRoot, "changes", slug);
    fs.mkdirSync(dir, { recursive: true });
    const base = {
      slug,
      currentPhase: "integration",
      completedPhases: [
        "change", "requirement", "design", "ui-design",
        "task", "dev", "test", "review", "integration",
      ],
      profile: "full",
      skippedPhases: [],
      strictDev: false,
      auxiliaryCompleted: [],
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify({ ...base, ...overrides }, null, 2));
  }

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-xchange-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("returns empty when no sibling changes exist", () => {
    makeChange("current");
    const findings = crossChangeFindings(taiyiRoot, "current");
    expect(findings).toEqual([]);
  });

  it("returns empty when siblings are also completed", () => {
    makeChange("current");
    makeChange("sibling-a");
    makeChange("sibling-b");
    const findings = crossChangeFindings(taiyiRoot, "current");
    expect(findings).toEqual([]);
  });

  it("flags a single active sibling change", () => {
    makeChange("current");
    makeChange("wip-feature", {
      slug: "wip-feature",
      currentPhase: "dev",
      completedPhases: ["change", "requirement", "design", "ui-design"],
    });
    const findings = crossChangeFindings(taiyiRoot, "current");
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("medium");
    expect(findings[0].code).toBe("cross-change.pending-changes");
    expect(findings[0].message).toContain("wip-feature");
  });

  it("flags multiple active sibling changes with correct count", () => {
    makeChange("current");
    makeChange("wip-a", {
      slug: "wip-a",
      currentPhase: "dev",
      completedPhases: ["change", "requirement"],
    });
    makeChange("wip-b", {
      slug: "wip-b",
      currentPhase: "change",
      completedPhases: [],
    });
    makeChange("done-c");
    const findings = crossChangeFindings(taiyiRoot, "current");
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("2 个");
    expect(findings[0].message).toContain("wip-a");
    expect(findings[0].message).toContain("wip-b");
    expect(findings[0].message).not.toContain("done-c");
  });

  it("ignores aborted siblings", () => {
    makeChange("current");
    makeChange("aborted-one", {
      slug: "aborted-one",
      currentPhase: "change",
      completedPhases: [],
      workflowStatus: "aborted",
    });
    const findings = crossChangeFindings(taiyiRoot, "current");
    expect(findings).toEqual([]);
  });

  it("ignores corrupt state.json silently", () => {
    makeChange("current");
    const badDir = path.join(taiyiRoot, "changes", "garbage");
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, "state.json"), "not valid json{{{");
    const findings = crossChangeFindings(taiyiRoot, "current");
    expect(findings).toEqual([]);
  });

  it("returns empty when .taiyi/changes/ does not exist", () => {
    const emptyRoot = path.join(workspace, "no-changes");
    const findings = crossChangeFindings(emptyRoot, "anything");
    expect(findings).toEqual([]);
  });
});
