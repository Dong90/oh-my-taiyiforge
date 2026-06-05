import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildPhaseGuide } from "../src/core/phase-guide.js";
import type { ChangeState } from "../src/core/types.js";

describe("phase-guide", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-guide-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("suggests editing artifact when template is empty", () => {
    const slug = "demo";
    const changeDir = path.join(root, "changes", slug);
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "# CHANGE\n\n## Motivation\n\n## Scope\n\n## Success Criteria\n");

    const state: ChangeState = {
      slug,
      currentPhase: "change",
      completedPhases: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const guide = buildPhaseGuide(root, slug, state);
    expect(guide.skill).toBe("taiyi-change");
    expect(guide.artifactExists).toBe(true);
    expect(guide.qualityReady).toBe(false);
    expect(guide.qualityHints.length).toBeGreaterThan(0);
    expect(guide.nextAction).toMatch(/完善/);
  });

  it("suggests complete when artifact passes validation", () => {
    const slug = "ready";
    const changeDir = path.join(root, "changes", slug);
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# CHANGE: X

## Motivation
Real motivation with enough text for validation checks.

## Scope
- In: a

## Success Criteria
- [ ] Done when tests pass
`,
    );

    const state: ChangeState = {
      slug,
      currentPhase: "change",
      completedPhases: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const guide = buildPhaseGuide(root, slug, state);
    expect(guide.qualityReady).toBe(true);
    expect(guide.nextAction).toMatch(/complete/);
    expect(guide.nextSkill).toBe("taiyi-requirement");
  });
});
