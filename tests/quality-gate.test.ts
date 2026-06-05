import { describe, expect, it } from "vitest";
import {
  evaluateQualityGate,
  QUALITY_DIMENSIONS,
} from "../src/core/gates/quality-gate.js";

describe("quality-gate", () => {
  it("defines five dimensions", () => {
    expect(QUALITY_DIMENSIONS).toHaveLength(5);
    expect(QUALITY_DIMENSIONS.map((d) => d.id)).toContain("traceability");
  });

  it("passes when all dimensions are true", () => {
    const result = evaluateQualityGate({
      completeness: true,
      consistency: true,
      verifiability: true,
      traceability: true,
      engineering_quality: true,
    });
    expect(result.passed).toBe(true);
    expect(result.failed).toHaveLength(0);
  });

  it("fails and lists failed dimensions", () => {
    const result = evaluateQualityGate({
      completeness: true,
      consistency: false,
      verifiability: true,
      traceability: false,
      engineering_quality: true,
    });
    expect(result.passed).toBe(false);
    expect(result.failed).toEqual(["consistency", "traceability"]);
  });
});
