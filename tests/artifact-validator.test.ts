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
