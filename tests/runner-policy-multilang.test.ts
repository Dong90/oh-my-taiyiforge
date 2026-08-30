import { describe, expect, it } from "vitest";
import {
  RunnerPolicyRegistry,
  type RunnerPolicyDefinition,
} from "../src/core/runner-policy-registry.js";

function dummyPolicy(id: string): RunnerPolicyDefinition {
  return {
    id,
    runner: "autopilot",
    maxIterations: 100,
    maxTokens: 200000,
    autoHarness: false,
    parallelism: 1,
    verifyEachPhase: false,
  };
}

describe("RunnerPolicyRegistry: multi-language support", () => {
  function fresh(): RunnerPolicyRegistry {
    const r = new RunnerPolicyRegistry();
    r.reset();
    return r;
  }

  it("universal policy matches any language", () => {
    const reg = fresh();
    reg.register({ ...dummyPolicy("uni") }, "yaml");
    expect(reg.get("uni", "typescript")).toBeDefined();
    expect(reg.get("uni", "go")).toBeDefined();
  });

  it("language-scoped policy returns undefined for non-matching language", () => {
    const reg = fresh();
    reg.register(
      { ...dummyPolicy("py-only"), languages: ["python"] },
      "yaml",
    );
    expect(reg.get("py-only", "python")).toBeDefined();
    expect(reg.get("py-only", "typescript")).toBeUndefined();
    expect(reg.get("py-only", "go")).toBeUndefined();
  });

  it("get() without language arg: language-scoped returns undefined", () => {
    const reg = fresh();
    reg.register(
      { ...dummyPolicy("py-only"), languages: ["python"] },
      "yaml",
    );
    expect(reg.get("py-only")).toBeUndefined();
  });

  it("list() filters by language", () => {
    const reg = fresh();
    reg.register({ ...dummyPolicy("u1") }, "yaml");
    reg.register(
      { ...dummyPolicy("t1"), languages: ["typescript"] },
      "yaml",
    );
    reg.register(
      { ...dummyPolicy("p1"), languages: ["python"] },
      "yaml",
    );

    const ts = reg.list("typescript").map((p) => p.id);
    expect(ts).toContain("t1");
    expect(ts).toContain("u1");
    expect(ts).not.toContain("p1");

    const py = reg.list("python").map((p) => p.id);
    expect(py).toContain("p1");
    expect(py).toContain("u1");
    expect(py).not.toContain("t1");
  });

  it("list() with no language: universal returned, scoped filtered out", () => {
    const reg = fresh();
    reg.register({ ...dummyPolicy("u1") }, "yaml");
    reg.register(
      { ...dummyPolicy("t1"), languages: ["typescript"] },
      "yaml",
    );
    const all = reg.list().map((p) => p.id);
    // u1 is universal → always listed. t1 is scoped → not listed without language.
    expect(all).toContain("u1");
    expect(all).not.toContain("t1");
  });
});
