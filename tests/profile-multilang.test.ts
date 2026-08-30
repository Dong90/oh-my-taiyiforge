import { describe, expect, it } from "vitest";
import {
  ProfileRegistry,
  type ProfileDefinition,
} from "../src/core/profile-registry.js";

function dummyProfile(id: string): ProfileDefinition {
  return {
    id,
    skipPhases: [],
    arch: "auto",
  };
}

describe("ProfileRegistry: multi-language support", () => {
  function fresh(): ProfileRegistry {
    const r = new ProfileRegistry();
    r.reset();
    return r;
  }

  it("universal profile matches any language", () => {
    const reg = fresh();
    reg.register(
      { ...dummyProfile("uni-profile"), languages: undefined },
      "yaml",
    );
    expect(reg.get("uni-profile", "typescript")).toBeDefined();
    expect(reg.get("uni-profile", "rust")).toBeDefined();
  });

  it("language-scoped profile returns undefined for non-matching language", () => {
    const reg = fresh();
    reg.register(
      { ...dummyProfile("py-profile"), languages: ["python"] },
      "yaml",
    );
    expect(reg.get("py-profile", "python")).toBeDefined();
    expect(reg.get("py-profile", "typescript")).toBeUndefined();
    expect(reg.get("py-profile", "go")).toBeUndefined();
  });

  it("get() without language arg: language-scoped returns undefined", () => {
    const reg = fresh();
    reg.register(
      { ...dummyProfile("py-profile"), languages: ["python"] },
      "yaml",
    );
    expect(reg.get("py-profile")).toBeUndefined();
  });

  it("list() filters by language (mix of universal and scoped)", () => {
    const reg = fresh();
    reg.register({ ...dummyProfile("u1") }, "yaml");
    reg.register(
      { ...dummyProfile("t1"), languages: ["typescript"] },
      "yaml",
    );
    reg.register(
      { ...dummyProfile("p1"), languages: ["python"] },
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

    const rust = reg.list("rust").map((p) => p.id);
    expect(rust).toContain("u1");
    expect(rust).not.toContain("t1");
    expect(rust).not.toContain("p1");
  });

  it("resolve() respects language filter", () => {
    const reg = fresh();
    reg.register(
      { ...dummyProfile("py-child"), languages: ["python"], extends: "parent" },
      "yaml",
    );
    reg.register({ ...dummyProfile("parent") }, "yaml");

    // no language → language-scoped child returns NOT_FOUND
    const r1 = reg.resolve("py-child");
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error.code).toBe("NOT_FOUND");

    // matching language → child returned
    const r2 = reg.resolve("py-child", "python");
    expect(r2.ok).toBe(true);

    // wrong language → NOT_FOUND
    const r3 = reg.resolve("py-child", "rust");
    expect(r3.ok).toBe(false);
  });

  it("resolve() intersects languages across the entire extends chain", () => {
    // CRITICAL-2 regression guard: a child that omits `languages` does NOT
    // widen the chain beyond its parent.
    //
    //   py-parent extends: ∅
    //       ↑
    //   universal-child extends: "py-parent"   (no own `languages`)
    //
    // Chain: [universal-child, py-parent]. The parent constrains to
    // `["python"]`; the child is universal. Effective: ["python"].
    // → resolve(child, "python") → ok
    // → resolve(child, "rust")   → NOT_FOUND
    const reg = fresh();
    reg.register(
      { ...dummyProfile("py-parent"), languages: ["python"] },
      "yaml",
    );
    reg.register(
      { ...dummyProfile("child"), extends: "py-parent" },
      "yaml",
    );

    expect(reg.resolve("child", "python").ok).toBe(true);
    expect(reg.resolve("child", "rust").ok).toBe(false);
  });

  it("resolve() does NOT widen child beyond parent's constraint", () => {
    // Even with explicit child languages, parent's constraint narrows it.
    // py-parent (["python"]) ← ts-child (["typescript"])
    //   intersection = [] → nothing matches
    const reg = fresh();
    reg.register(
      { ...dummyProfile("py-parent"), languages: ["python"] },
      "yaml",
    );
    reg.register(
      { ...dummyProfile("ts-child"), languages: ["typescript"], extends: "py-parent" },
      "yaml",
    );

    expect(reg.resolve("ts-child", "python").ok).toBe(false);
    expect(reg.resolve("ts-child", "typescript").ok).toBe(false);
  });
});
