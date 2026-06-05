import { describe, expect, it } from "vitest";
import { evaluateHumanGate } from "../src/core/gates/human-gate.js";

describe("human-gate", () => {
  it("blocks advance when human approval is missing", () => {
    const result = evaluateHumanGate({ approved: false, approver: "" });
    expect(result.passed).toBe(false);
  });

  it("passes when approved with non-empty approver", () => {
    const result = evaluateHumanGate({
      approved: true,
      approver: "lead@example.com",
    });
    expect(result.passed).toBe(true);
  });
});
