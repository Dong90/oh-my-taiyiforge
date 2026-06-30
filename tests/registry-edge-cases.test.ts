import { describe, expect, it, beforeEach } from "vitest";
import {
  ProfileRegistry,
  getDefaultRegistry,
  resetProfileRegistry,
  registerProfile,
} from "../src/core/profile-registry.js";

beforeEach(() => {
  resetProfileRegistry();
  getDefaultRegistry();
});

describe("profile-registry: deep extends chain (5+ levels)", () => {
  it("resolves 5-level deep extends chain (A→B→C→D→E→F)", () => {
    const reg = getDefaultRegistry();
    reg.ensureBuiltins();
    reg.register(
      { id: "a", extends: "b", skipPhases: ["a"], arch: "auto" },
      "programmatic",
    );
    reg.register(
      { id: "b", extends: "c", skipPhases: ["b"], arch: "auto" },
      "programmatic",
    );
    reg.register(
      { id: "c", extends: "d", skipPhases: ["c"], arch: "auto" },
      "programmatic",
    );
    reg.register(
      { id: "d", extends: "e", skipPhases: ["d"], arch: "auto" },
      "programmatic",
    );
    reg.register(
      { id: "e", extends: "f", skipPhases: ["e"], arch: "auto" },
      "programmatic",
    );
    reg.register(
      { id: "f", skipPhases: ["f"], arch: "auto" },
      "programmatic",
    );
    const r = reg.resolve("a");
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Union of all 6 skipPhases
      expect(r.value.skipPhases.sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
    }
  });

  it("self-extend (A→A) detected as CYCLE", () => {
    const reg = new ProfileRegistry();
    reg.ensureBuiltins();
    reg.register(
      { id: "self-extender", extends: "self-extender", skipPhases: [], arch: "auto" },
      "programmatic",
    );
    const r = reg.resolve("self-extender");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("CYCLE");
  });
});

describe("profile-registry: reset + re-ensure behavior", () => {
  it("after reset(), custom profiles are gone, builtins reload on next access", () => {
    const reg = getDefaultRegistry();
    reg.register(
      { id: "custom-temp", skipPhases: [], arch: "auto" },
      "programmatic",
    );
    expect(reg.get("custom-temp")).toBeDefined();
    resetProfileRegistry();
    const reg2 = getDefaultRegistry();
    expect(reg2.get("custom-temp")).toBeUndefined();
    // builtins still load
    expect(reg2.get("full")).toBeDefined();
    expect(reg2.list().filter((p) => p.builtin).length).toBe(7);
  });
});
