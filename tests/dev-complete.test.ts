import { describe, expect, it } from "vitest";
import { isDevCompleteEvidence, DEV_COMPLETE_EVIDENCE } from "../src/core/dev-complete.js";
import { validateArtifactContent } from "../src/core/artifact-validator.js";

describe("dev-complete evidence", () => {
  it("accepts standard evidence", () => {
    expect(isDevCompleteEvidence(DEV_COMPLETE_EVIDENCE)).toBe(true);
    const v = validateArtifactContent("dev", DEV_COMPLETE_EVIDENCE);
    expect(Object.values(v.scores).every(Boolean)).toBe(true);
  });

  it("rejects text-only marker without command/exitCode", () => {
    expect(isDevCompleteEvidence("dev complete\n")).toBe(false);
    const v = validateArtifactContent("dev", "dev complete\n");
    expect(v.scores.verifiability).toBe(false);
    expect(v.hints.join(" ")).toMatch(/command|exitCode/);
  });
});
