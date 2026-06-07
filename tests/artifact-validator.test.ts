import { describe, expect, it } from "vitest";
import { validateArtifactContent } from "../src/core/artifact-validator.js";

describe("artifact-validator", () => {
  it("rejects empty CHANGE template placeholders", () => {
    const r = validateArtifactContent(
      "change",
      "# CHANGE: {{title}}\n\n## Motivation\n<!-- -->\n\n## Scope\n\n## Success Criteria\n",
    );
    expect(r.scores.completeness).toBe(false);
    expect(r.scores.consistency).toBe(false);
    expect(r.hints.length).toBeGreaterThan(0);
  });

  it("rejects placeholder REQUIREMENT template", () => {
    const r = validateArtifactContent(
      "requirement",
      `# REQUIREMENT: Demo

## User Stories
| ID | As a… | I want… | So that… |
|----|--------|---------|----------|
| US-1 | | | |

## Acceptance Criteria (Given / When / Then)
### US-1
- **Given** …
- **When** …
- **Then** …

## Traceability
| AC | Links to CHANGE.md |
| US-1 | Motivation |
`,
    );
    expect(r.scores.completeness).toBe(false);
    expect(r.hints.some((h) => /User Stories/i.test(h))).toBe(true);
  });

  it("rejects placeholder DESIGN template", () => {
    const r = validateArtifactContent(
      "design",
      `# DESIGN: Demo

## Options
| Option | Summary | Pros | Cons | Cost |
| A | | | | |
| B | | | | |

## Decision
**Chosen:** Option …
**Reason:** …
`,
    );
    expect(r.scores.completeness).toBe(false);
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
});
