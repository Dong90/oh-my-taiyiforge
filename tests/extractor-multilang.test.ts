import { describe, expect, it } from "vitest";
import {
  ExtractorRegistry,
  type ExtractorDefinition,
} from "../src/core/extractor-registry.js";

function dummyExtractor(name: string, phase = "change"): ExtractorDefinition {
  return {
    phase,
    name,
    extract: () => [],
  };
}

describe("ExtractorRegistry: multi-language support", () => {
  function fresh(): ExtractorRegistry {
    const r = new ExtractorRegistry();
    r.reset();
    return r;
  }

  it("universal extractor matches any language", () => {
    const reg = fresh();
    reg.register({ ...dummyExtractor("uni"), languages: undefined }, "yaml");
    expect(reg.get("change", "uni", "typescript")).toBeDefined();
    expect(reg.get("change", "uni", "python")).toBeDefined();
    expect(reg.get("change", "uni", "rust")).toBeDefined();
  });

  it("explicit empty array means universal (match all)", () => {
    const reg = fresh();
    reg.register({ ...dummyExtractor("empty"), languages: [] }, "yaml");
    expect(reg.get("change", "empty", "typescript")).toBeDefined();
    expect(reg.get("change", "empty", "go")).toBeDefined();
  });

  it("language-scoped extractor returns undefined for non-matching language", () => {
    const reg = fresh();
    reg.register(
      { ...dummyExtractor("ts-only"), languages: ["typescript"] },
      "yaml",
    );
    expect(reg.get("change", "ts-only", "typescript")).toBeDefined();
    expect(reg.get("change", "ts-only", "python")).toBeUndefined();
    expect(reg.get("change", "ts-only", "rust")).toBeUndefined();
  });

  it("language-scoped extractor without language arg returns undefined", () => {
    const reg = fresh();
    reg.register(
      { ...dummyExtractor("ts-only"), languages: ["typescript"] },
      "yaml",
    );
    expect(reg.get("change", "ts-only")).toBeUndefined();
  });

  it("multi-language extractor matches any of its languages", () => {
    const reg = fresh();
    reg.register(
      { ...dummyExtractor("web"), languages: ["typescript", "javascript"] },
      "yaml",
    );
    expect(reg.get("change", "web", "typescript")).toBeDefined();
    expect(reg.get("change", "web", "javascript")).toBeDefined();
    expect(reg.get("change", "web", "python")).toBeUndefined();
  });

  it("list() filters by language (universal + scoped mix)", () => {
    const reg = fresh();
    reg.register({ ...dummyExtractor("a") }, "yaml");
    reg.register(
      { ...dummyExtractor("b"), languages: ["typescript"] },
      "yaml",
    );
    reg.register(
      { ...dummyExtractor("c"), languages: ["python"] },
      "yaml",
    );

    const ts = reg.list("typescript").map((e) => e.name);
    expect(ts).toContain("a");
    expect(ts).toContain("b");
    expect(ts).not.toContain("c");

    const py = reg.list("python").map((e) => e.name);
    expect(py).toContain("a");
    expect(py).toContain("c");
    expect(py).not.toContain("b");

    const rust = reg.list("rust").map((e) => e.name);
    expect(rust).toContain("a");
    expect(rust).not.toContain("b");
    expect(rust).not.toContain("c");
  });

  it("universal extractor still listed across queries", () => {
    const reg = fresh();
    reg.register({ ...dummyExtractor("universal") }, "yaml");
    expect(reg.list("typescript").find((e) => e.name === "universal")).toBeDefined();
    expect(reg.list("rust").find((e) => e.name === "universal")).toBeDefined();
  });

  it("listByPhase accepts optional language filter", () => {
    const reg = fresh();
    // Use a phase name not present in BUILTIN_EXTRACTORS to avoid the
    // builtin-protection guard kicking in and rejecting our yaml registrations.
    const TEST_PHASE = "test-synth-phase";
    reg.register({ ...dummyExtractor("u", TEST_PHASE) }, "yaml");
    reg.register(
      { ...dummyExtractor("t", TEST_PHASE), languages: ["typescript"] },
      "yaml",
    );
    reg.register(
      { ...dummyExtractor("r", TEST_PHASE), languages: ["rust"] },
      "yaml",
    );

    // No language: only universal extractor is listed (scoped entries
    // require a concrete language per matchesLanguage semantics).
    expect(reg.listByPhase(TEST_PHASE).map((e) => e.name)).toEqual(["u"]);

    // typescript filter: universal + ts-scoped, but NOT rust-scoped
    const ts = reg.listByPhase(TEST_PHASE, "typescript").map((e) => e.name);
    expect(ts.sort()).toEqual(["t", "u"]);

    const rust = reg.listByPhase(TEST_PHASE, "rust").map((e) => e.name);
    expect(rust.sort()).toEqual(["r", "u"]);
  });
});
