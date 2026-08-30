import { describe, expect, it, afterEach } from "vitest";
import { RunnerPolicyRegistry, selectRunnerForPolicy } from "../src/core/runner-policy-registry.js";

describe("strict runner policy", () => {
  afterEach(() => { delete process.env.TAIYI_STRICT_CONFIG; });

  it("fails closed for unknown policies in strict mode", () => {
    process.env.TAIYI_STRICT_CONFIG = "1";
    const registry = new RunnerPolicyRegistry();
    expect(() => selectRunnerForPolicy("not-configured", registry)).toThrow(/Unknown runner policy/);
  });

  it("keeps interactive fallback for unknown policies", () => {
    delete process.env.TAIYI_STRICT_CONFIG;
    expect(selectRunnerForPolicy("not-configured", new RunnerPolicyRegistry())).toBe("autopilot");
  });
});
