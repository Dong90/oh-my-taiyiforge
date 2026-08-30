import { describe, expect, it } from "vitest";
import { isHarnessEvidenceFresh } from "../src/core/harness-checkpoints.js";

describe("harness evidence freshness", () => {
  const evidence = {
    passed: true,
    command: "npm test",
    exitCode: 0,
    capturedAt: "2026-08-30T00:00:00.000Z",
    inputFingerprint: "source-a",
  };

  it("accepts evidence when the source fingerprint is unchanged", () => {
    expect(isHarnessEvidenceFresh(evidence, "source-a")).toBe(true);
  });

  it("invalidates evidence after source changes", () => {
    expect(isHarnessEvidenceFresh(evidence, "source-b")).toBe(false);
  });
});
