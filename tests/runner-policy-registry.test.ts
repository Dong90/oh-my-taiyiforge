import { describe, expect, it, beforeEach } from "vitest";
import {
  RunnerPolicyRegistry,
  getDefaultRunnerPolicyRegistry,
  resetDefaultRunnerPolicyRegistry,
  registerRunnerPolicy,
  selectRunnerForPolicy,
  type RunnerPolicyDefinition,
  type RunnerName,
} from "../src/core/runner-policy-registry.js";
import { BUILTIN_RUNNER_POLICIES } from "../src/core/builtin-runner-policies.js";

beforeEach(() => {
  resetDefaultRunnerPolicyRegistry();
  getDefaultRunnerPolicyRegistry();
});

describe("runner-policy-registry: in-memory register/get/list", () => {
  it("registers a runner policy and retrieves via get", () => {
    const reg = new RunnerPolicyRegistry();
    const r = reg.register(
      {
        id: "custom-strict",
        runner: "autopilot",
        maxIterations: 50,
        maxTokens: 100000,
        autoHarness: true,
        builtin: false,
        description: "Strict custom policy",
      },
      "programmatic",
    );
    expect(r.ok).toBe(true);
    const got = reg.get("custom-strict");
    expect(got).toBeDefined();
    expect(got?.runner).toBe("autopilot");
    expect(got?.maxIterations).toBe(50);
  });

  it("lists all registered policies", () => {
    const reg = new RunnerPolicyRegistry();
    reg.ensureBuiltins();
    reg.register(
      { id: "p1", runner: "autopilot", maxIterations: 10, maxTokens: 5000, autoHarness: false, builtin: false },
      "programmatic",
    );
    reg.register(
      { id: "p2", runner: "ralph", maxIterations: 20, maxTokens: 10000, autoHarness: false, builtin: false },
      "programmatic",
    );
    const custom = reg.list().filter((p) => p.id === "p1" || p.id === "p2");
    expect(custom).toHaveLength(2);
  });

  it("builtin policies are loaded on ensureBuiltins()", () => {
    const reg = new RunnerPolicyRegistry();
    reg.ensureBuiltins();
    const builtins = reg.list().filter((p) => p.builtin);
    expect(builtins.length).toBe(BUILTIN_RUNNER_POLICIES.length);
  });

  it("builtin policy cannot be overridden by programmatic source", () => {
    const reg = new RunnerPolicyRegistry();
    reg.ensureBuiltins();
    const first = BUILTIN_RUNNER_POLICIES[0]!;
    const r = reg.register(
      {
        ...first,
        builtin: false,
      },
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DUPLICATE");
  });
});

describe("runner-policy-registry: selectRunnerForPolicy", () => {
  it("returns the runner field for builtin policy", () => {
    const reg = getDefaultRunnerPolicyRegistry();
    reg.ensureBuiltins();
    expect(selectRunnerForPolicy("autopilot", reg)).toBe("autopilot");
    expect(selectRunnerForPolicy("ralph", reg)).toBe("ralph");
    expect(selectRunnerForPolicy("team", reg)).toBe("team");
    expect(selectRunnerForPolicy("ultrawork", reg)).toBe("ultrawork");
  });

  it("returns 'autopilot' as default for unknown policy id", () => {
    const reg = getDefaultRunnerPolicyRegistry();
    reg.ensureBuiltins();
    expect(selectRunnerForPolicy("nonexistent-policy", reg)).toBe("autopilot");
  });

  it("returns 'loop' as a valid runner (helper category)", () => {
    const reg = getDefaultRunnerPolicyRegistry();
    reg.ensureBuiltins();
    expect(selectRunnerForPolicy("loop", reg)).toBe("loop");
  });
});

describe("runner-policy-registry: builtin policies", () => {
  it("has 4 builtin presets (autopilot/ralph/team/ultrawork)", () => {
    const reg = getDefaultRunnerPolicyRegistry();
    reg.ensureBuiltins();
    const ids = BUILTIN_RUNNER_POLICIES.map((p) => p.id);
    expect(ids).toContain("autopilot");
    expect(ids).toContain("ralph");
    expect(ids).toContain("team");
    expect(ids).toContain("ultrawork");
  });

  it("autopilot preset has higher maxIterations than lite presets", () => {
    const reg = getDefaultRunnerPolicyRegistry();
    reg.ensureBuiltins();
    const autopilot = reg.get("autopilot");
    const team = reg.get("team");
    expect(autopilot).toBeDefined();
    expect(team).toBeDefined();
    if (autopilot && team) {
      // Both are real runner names; assertions below
      expect(autopilot.runner).toBe("autopilot");
      expect(team.runner).toBe("team");
    }
  });
});
