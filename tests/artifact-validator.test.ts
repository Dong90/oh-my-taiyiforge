import { describe, expect, it } from "vitest";
import { validateArtifactContent, validateArtifactFile } from "../src/core/artifact-validator.js";
import { TAIYI_SEED_MARKER } from "../src/core/seed-marker.js";
import { auxiliaryArtifactSatisfied } from "../src/core/auxiliary-artifacts.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("artifact-validator", () => {
  it("rejects engine seed template marker", () => {
    const r = validateArtifactContent(
      "change",
      `${TAIYI_SEED_MARKER}\n# CHANGE: Demo\n\n## Motivation\nfilled\n\n## Scope\nin\n\n## Success Criteria\n- [ ] x\n`,
    );
    expect(r.scores.completeness).toBe(false);
    expect(r.hints.some((h) => /模板占位/i.test(h))).toBe(true);
  });

  it("seeded CONTEXT.md does not satisfy taiyi-intel-scan", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-aux-"));
    fs.writeFileSync(
      path.join(dir, "CONTEXT.md"),
      `${TAIYI_SEED_MARKER}\n# CONTEXT\n`,
      "utf8",
    );
    expect(auxiliaryArtifactSatisfied(dir, "taiyi-intel-scan")).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects empty CHANGE template placeholders", () => {
    const r = validateArtifactContent(
      "change",
      "# CHANGE: {{title}}\n\n## Motivation\n<!-- -->\n\n## Scope\n\n## Success Criteria\n",
    );
    expect(r.scores.completeness).toBe(false);
    expect(r.scores.consistency).toBe(false);
    expect(r.hints.length).toBeGreaterThan(0);
  });

  it("Zod phase REQUIREMENT without JSON → fails via validateArtifactFile", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "REQUIREMENT.md"), "content enough for 60 characters minimum fill text here more");
    const r = validateArtifactFile(path.join(dir, "REQUIREMENT.md"), "requirement");
    expect(r).not.toBeNull();
    expect(r!.scores.completeness).toBe(false);
    expect(r!.hints.some((h) => /缺少 requirement\.json/.test(h))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("Zod phase DESIGN without JSON → fails via validateArtifactFile", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-av-"));
    fs.writeFileSync(path.join(dir, "DESIGN.md"), "content enough for 60 characters minimum fill text here more longer");
    const r = validateArtifactFile(path.join(dir, "DESIGN.md"), "design");
    expect(r).not.toBeNull();
    expect(r!.scores.completeness).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects TASK without TDD plan cues", () => {
    const r = validateArtifactContent(
      "task",
      `# TASK: Demo

## Slices (vertical, smallest shippable first)

| # | Slice | Depends | Done when |
|---|-------|---------|-----------|
| 1 | add field | — | works |

## Checklist per slice

- [ ] ship it
`,
    );
    expect(r.scores.completeness).toBe(false);
    expect(r.hints.some((h) => /测试先行|TDD|test/i.test(h))).toBe(true);
  });

  it("accepts TASK with test-first plan", () => {
    const r = validateArtifactContent(
      "task",
      `# TASK: Demo

## Slices

| # | Slice | Depends | Done when |
|---|-------|---------|-----------|
| 1 | api | — | npm test api green |

## Checklist per slice

- [ ] 测试先行（RED）
`,
    );
    expect(r.scores.completeness).toBe(true);
  });

  it("accepts filled CHANGE.md", () => {
    const r = validateArtifactContent(
      "change",
      `# CHANGE: Demo

## Motivation
Users need faster auth timeout handling for security compliance.

## Scope
- In: session TTL
- Out: SSO migration

## Risks
Low — config only

## Success Criteria
- [ ] Session expires after configured idle time
`,
    );
    expect(r.scores.completeness).toBe(true);
    expect(r.scores.consistency).toBe(true);
    expect(r.scores.verifiability).toBe(true);
  });

  it("allows Out of Scope: none without pending-language hint", () => {
    const body = `# REQUIREMENT: Demo

## User Stories

| ID | As a… | I want… | So that… |
|----|--------|---------|----------|
| US-1 | user | login | access app |

## Acceptance Criteria (Given / When / Then)

### US-1

- **Given** user on login page with valid account
- **When** user submits correct credentials
- **Then** user lands on dashboard home screen

## Traceability

| AC | Links to CHANGE.md |
|----|-------------------|
| US-1 | Motivation |

## Out of Scope

none
`;
    const r = validateArtifactContent("requirement", body);
    expect(r.hints.some((h) => /待补|TODO/i.test(h))).toBe(false);
  });
});
