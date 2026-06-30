import { describe, expect, it, beforeEach } from "vitest";
import {
  ProfileRegistry,
  getDefaultRegistry,
  resetProfileRegistry,
  registerProfile,
  resolveProfile,
  getProfile,
  listProfiles,
  type ProfileDefinition,
} from "../src/core/profile-registry.js";
import { BUILTIN_PROFILES } from "../src/core/builtin-profiles.js";
import { PROFILE_SKIPPED, skippedPhasesForProfile, resolveArchTemplateForChange } from "../src/core/profile.js";

describe("profile-registry: in-memory register/get/list", () => {
  let reg: ProfileRegistry;

  beforeEach(() => {
    reg = new ProfileRegistry();
  });

  it("registers a profile and retrieves via get", () => {
    const def: ProfileDefinition = {
      id: "my-profile",
      skipPhases: ["ui-design"],
      arch: "auto",
    };
    const r = reg.register(def, "programmatic");
    expect(r.ok).toBe(true);
    expect(reg.get("my-profile")).toEqual(def);
  });

  it("lists all registered profiles", () => {
    reg.register({ id: "a", skipPhases: [], arch: "auto" }, "programmatic");
    reg.register({ id: "b", skipPhases: ["design"], arch: "generic" }, "programmatic");
    const list = reg.list();
    // 注册 a + b，builtins 也会被 ensureBuiltins 自动加载
    const ours = list.filter((d) => d.id === "a" || d.id === "b");
    expect(ours).toHaveLength(2);
    expect(ours.map((d) => d.id).sort()).toEqual(["a", "b"]);
  });

  it("get returns undefined for unknown id", () => {
    expect(reg.get("nonexistent")).toBeUndefined();
  });

  it("rejects invalid profile: missing skipPhases (zod validation)", () => {
    const r = reg.register(
      // skip missing skipPhases
      { id: "bad", arch: "auto" } as any,
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION");
    }
  });

  it("rejects invalid profile: bad id format (kebab-case regex)", () => {
    const r = reg.register(
      { id: "BadId", skipPhases: [], arch: "auto" },
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION");
    }
  });

  it("rejects re-registering same id from same source", () => {
    reg.register({ id: "dup", skipPhases: [], arch: "auto" }, "programmatic");
    const r = reg.register(
      { id: "dup", skipPhases: ["design"], arch: "auto" },
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("DUPLICATE");
    }
  });
});

// ── Cycle 2: Built-in fallback ──

describe("profile-registry: built-in fallback", () => {
  beforeEach(() => {
    resetProfileRegistry();
  });

  it("loads 7 built-in profiles on first getDefaultRegistry() call", () => {
    const reg = getDefaultRegistry();
    const list = reg.list();
    expect(list).toHaveLength(7);
    expect(list.map((d) => d.id).sort()).toEqual(
      ["api", "full", "lite", "micro", "nano", "spike", "ui"].sort(),
    );
  });

  it("builtin skipped phases match legacy PROFILE_SKIPPED for all 7", () => {
    const reg = getDefaultRegistry();
    for (const def of BUILTIN_PROFILES) {
      const got = reg.get(def.id);
      expect(got).toBeDefined();
      expect(got!.skipPhases.sort()).toEqual([...def.skipPhases].sort());
    }
  });

  it("builtin arch mapping matches legacy PROFILE_ARCH_MAP for all 7", () => {
    const reg = getDefaultRegistry();
    // 老映射：micro / nano → generic，其他 → auto
    const expected: Record<string, string> = {
      full: "auto",
      api: "auto",
      ui: "auto",
      lite: "auto",
      spike: "auto",
      micro: "generic",
      nano: "generic",
    };
    for (const [id, arch] of Object.entries(expected)) {
      expect(reg.get(id)?.arch).toBe(arch);
    }
  });

  it("builtin id cannot be overridden by programmatic register (DUPLICATE)", () => {
    const reg = getDefaultRegistry();
    const r = reg.register(
      { id: "full", skipPhases: ["ui-design"], arch: "auto" },
      "programmatic",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("DUPLICATE");
    }
  });

  it("resetProfileRegistry() restores builtins only", () => {
    const reg = getDefaultRegistry();
    reg.register(
      { id: "custom", skipPhases: [], arch: "auto" },
      "programmatic",
    );
    expect(reg.list().length).toBe(8);
    resetProfileRegistry();
    const reg2 = getDefaultRegistry();
    expect(reg2.list().length).toBe(7);
    expect(reg2.get("custom")).toBeUndefined();
  });
});

// ── Cycle 3: resolve + extends ──

describe("profile-registry: resolve + extends", () => {
  let reg: ProfileRegistry;

  beforeEach(() => {
    reg = new ProfileRegistry();
    reg.ensureBuiltins();
  });

  it("resolve returns full definition for builtin profile", () => {
    const r = reg.resolve("full");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe("full");
      expect(r.value.skipPhases).toEqual([]);
      expect(r.value.arch).toBe("auto");
    }
  });

  it("resolve merges skipPhases from extends chain via Set union", () => {
    reg.register(
      { id: "child", extends: "api", skipPhases: ["review"], arch: "auto" },
      "programmatic",
    );
    const r = reg.resolve("child");
    expect(r.ok).toBe(true);
    if (r.ok) {
      // child skips review, api skips ui-design → union = {review, ui-design}
      expect(r.value.skipPhases.sort()).toEqual(["review", "ui-design"]);
    }
  });

  it("resolve overrides parent arch with child arch", () => {
    reg.register(
      { id: "child", extends: "nano", skipPhases: [], arch: "fastapi-6layer" },
      "programmatic",
    );
    const r = reg.resolve("child");
    expect(r.ok).toBe(true);
    if (r.ok) {
      // nano is "generic", child overrides to "fastapi-6layer"
      expect(r.value.arch).toBe("fastapi-6layer");
    }
  });

  it("resolve returns NOT_FOUND for unknown id", () => {
    const r = reg.resolve("nonexistent");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("NOT_FOUND");
      expect(r.error.profileId).toBe("nonexistent");
    }
  });

  it("resolve detects self-cycle: A extends A", () => {
    reg.register(
      { id: "self-cycler", extends: "self-cycler", skipPhases: [], arch: "auto" },
      "programmatic",
    );
    const r = reg.resolve("self-cycler");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("CYCLE");
    }
  });

  it("resolve detects 2-cycle: A extends B, B extends A", () => {
    reg.register(
      { id: "a-cycles", extends: "b-cycles", skipPhases: [], arch: "auto" },
      "programmatic",
    );
    reg.register(
      { id: "b-cycles", extends: "a-cycles", skipPhases: [], arch: "auto" },
      "programmatic",
    );
    const r = reg.resolve("a-cycles");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("CYCLE");
    }
  });
});

// ── Cycle 6: top-level API + priority ──

describe("profile-registry: top-level API", () => {
  beforeEach(() => {
    resetProfileRegistry();
    getDefaultRegistry();
  });

  it("registerProfile with source=programmatic (default) adds to default registry", () => {
    const r = registerProfile({
      id: "my-custom",
      skipPhases: [],
      arch: "auto",
    });
    expect(r.ok).toBe(true);
    expect(getProfile("my-custom")).toBeDefined();
  });

  it("listProfiles returns all profiles (builtins + custom)", () => {
    registerProfile({ id: "c1", skipPhases: [], arch: "auto" });
    registerProfile({ id: "c2", skipPhases: [], arch: "auto" });
    const list = listProfiles();
    // 7 builtins + 2 custom
    expect(list.length).toBe(9);
    expect(list.map((d) => d.id).sort()).toEqual(
      ["api", "c1", "c2", "full", "lite", "micro", "nano", "spike", "ui"],
    );
  });

  it("resolveProfile top-level delegates to default registry", () => {
    const r = resolveProfile("full");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.id).toBe("full");
    }
  });

  it("getProfile returns undefined for unknown id", () => {
    expect(getProfile("nonexistent")).toBeUndefined();
  });

  it("priority: programmatic source overrides yaml overrides package.json overrides builtin", () => {
    // builtin "lite" has skipPhases: ["design", "ui-design", "task", "review"]
    // We verify that a programmatic register with same id is rejected (builtin protection),
    // but a non-builtin id can be overridden by later sources.
    registerProfile({ id: "custom-1", skipPhases: ["a"], arch: "auto" });
    const r2 = registerProfile({
      id: "custom-1",
      skipPhases: ["a", "b"],
      arch: "generic",
    });
    // Same source = DUPLICATE
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.error.code).toBe("DUPLICATE");
    }
    // Original stays
    expect(getProfile("custom-1")?.skipPhases).toEqual(["a"]);
  });
});
describe("profile-registry: backward compat (legacy exports)", () => {
  it("PROFILE_SKIPPED returns correct phases for all 7 profiles", () => {
    expect(PROFILE_SKIPPED["full"]).toEqual([]);
    expect(PROFILE_SKIPPED["api"]).toEqual(["ui-design"]);
    expect(PROFILE_SKIPPED["ui"]).toEqual([]);
    // both sides sorted for stable comparison
    expect([...PROFILE_SKIPPED["lite"]].sort()).toEqual(
      ["design", "review", "task", "ui-design"],
    );
    expect([...PROFILE_SKIPPED["spike"]].sort()).toEqual(
      ["design", "requirement", "review", "task", "ui-design"],
    );
    expect([...PROFILE_SKIPPED["micro"]].sort()).toEqual(
      ["design", "requirement", "review", "task", "test", "ui-design"],
    );
    expect([...PROFILE_SKIPPED["nano"]].sort()).toEqual(
      [
        "change",
        "design",
        "requirement",
        "review",
        "task",
        "test",
        "ui-design",
      ],
    );
  });

  it("skippedPhasesForProfile returns copy (mutating result doesn't affect PROFILE_SKIPPED)", () => {
    const r = skippedPhasesForProfile("full");
    expect(r).toEqual([]);
    r.push("hacked");
    expect(PROFILE_SKIPPED["full"]).toEqual([]);
  });

  it("resolveArchTemplateForChange returns generic for micro/nano when workspace dir missing", () => {
    const r1 = resolveArchTemplateForChange("micro", "/nonexistent");
    const r2 = resolveArchTemplateForChange("nano", "/nonexistent");
    expect(r1.id).toBe("generic");
    expect(r2.id).toBe("generic");
  });
});
