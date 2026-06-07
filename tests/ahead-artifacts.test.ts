import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { detectAheadArtifacts } from "../src/core/ahead-artifacts.js";
import type { ChangeState } from "../src/core/types.js";

function baseState(overrides: Partial<ChangeState> = {}): ChangeState {
  return {
    slug: "demo",
    currentPhase: "change",
    completedPhases: [],
    profile: "full",
    skippedPhases: [],
    strictDev: false,
    autoHarness: false,
    auxiliaryCompleted: [],
    workflowStatus: "active",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
}

describe("ahead-artifacts", () => {
  let changeDir: string;

  beforeEach(() => {
    changeDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-ahead-"));
  });

  afterEach(() => {
    fs.rmSync(changeDir, { recursive: true, force: true });
  });

  it("flags future phase artifacts while still on change", () => {
    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      "# REQUIREMENT\n\n## User Stories\n- as user I want x\n",
      "utf8",
    );
    const findings = detectAheadArtifacts(changeDir, baseState());
    expect(findings.some((f) => f.code === "artifacts.ahead-of-phase")).toBe(true);
    expect(findings[0]?.file).toBe("REQUIREMENT.md");
  });

  it("ignores artifact for current phase", () => {
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      "# CHANGE\n\n## Motivation\nok\n\n## Scope\nin\n\n## Success Criteria\n- [x] done\n",
      "utf8",
    );
    const findings = detectAheadArtifacts(changeDir, baseState());
    expect(findings).toEqual([]);
  });

  it("flags missing artifacts for incomplete earlier phases", () => {
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      "# CHANGE\n\n## Motivation\nok\n\n## Scope\nin\n\n## Success Criteria\n- [x] done\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(changeDir, "TEST.md"),
      "# TEST\n\n## Execution Log\n- ran tests\n",
      "utf8",
    );
    const findings = detectAheadArtifacts(
      changeDir,
      baseState({
        currentPhase: "test",
        completedPhases: ["change"],
      }),
    );
    expect(findings.some((f) => f.code === "artifacts.missing-for-incomplete")).toBe(
      true,
    );
  });

  it("flags orphan artifacts on skipped phases", () => {
    fs.writeFileSync(
      path.join(changeDir, "UI-DESIGN.md"),
      "# UI\n\n## Layout\nok layout spec here\n",
      "utf8",
    );
    const findings = detectAheadArtifacts(
      changeDir,
      baseState({ profile: "api", skippedPhases: ["ui-design"] }),
    );
    expect(findings.some((f) => f.code === "artifacts.orphan-skipped")).toBe(true);
  });
});
