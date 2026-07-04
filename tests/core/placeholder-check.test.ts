import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_PATTERNS,
  countPlaceholders,
  hasPlaceholders,
  hasSubstantiveContent,
} from "../../src/core/placeholder-check.js";

// ---------------------------------------------------------------------------
// 5 detection patterns
// ---------------------------------------------------------------------------

describe("PLACEHOLDER_PATTERNS — Chinese-underscore", () => {
  const re = PLACEHOLDER_PATTERNS[0];

  it("matches _待定_", () => {
    expect(re.test("_待定_")).toBe(true);
  });

  it("matches _在此列出xxx_", () => {
    expect(re.test("_在此列出相关团队和接口_")).toBe(true);
  });

  it("matches _现状_", () => {
    expect(re.test("_现状_")).toBe(true);
  });

  it("does not match plain English italics _hello world_", () => {
    expect(re.test("_hello world_")).toBe(false);
  });
});

describe("PLACEHOLDER_PATTERNS — Numeric/abbrev underscore", () => {
  const re = PLACEHOLDER_PATTERNS[1];

  it("matches _5_", () => {
    expect(re.test("_5_")).toBe(true);
  });

  it("matches _N/A_", () => {
    expect(re.test("_N/A_")).toBe(true);
  });

  it("matches _CI/CD_", () => {
    expect(re.test("_CI/CD_")).toBe(true);
  });
});

describe("PLACEHOLDER_PATTERNS — Chinese bracket", () => {
  const re = PLACEHOLDER_PATTERNS[2];

  it("matches [量化]", () => {
    expect(re.test("[量化]")).toBe(true);
  });

  it("matches [步骤]", () => {
    expect(re.test("[步骤]")).toBe(true);
  });

  it("matches [性能指标]", () => {
    expect(re.test("[性能指标]")).toBe(true);
  });
});

describe("PLACEHOLDER_PATTERNS — English bracket", () => {
  const re = PLACEHOLDER_PATTERNS[3];

  it("matches [TODO]", () => {
    expect(re.test("[TODO]")).toBe(true);
  });

  it("matches [TBD]", () => {
    expect(re.test("[TBD]")).toBe(true);
  });

  it("matches [FILL: xxx]", () => {
    expect(re.test("[FILL: add reasoning here]")).toBe(true);
  });

  it("matches case-insensitive [todo]", () => {
    expect(re.test("[todo]")).toBe(true);
  });

  it("matches case-insensitive [tbd]", () => {
    expect(re.test("[tbd]")).toBe(true);
  });
});

describe("PLACEHOLDER_PATTERNS — HTML comment", () => {
  const re = PLACEHOLDER_PATTERNS[4];

  it("matches <!-- FILL-ME: -->", () => {
    expect(re.test("<!-- FILL-ME: -->")).toBe(true);
  });

  it("matches with extra spaces <!--   FILL-ME:   -->", () => {
    expect(re.test("<!--   FILL-ME:   -->")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Non-placeholder (no false matches)
// ---------------------------------------------------------------------------

describe("non-placeholder content", () => {
  it("node_version: 20 is not a placeholder", () => {
    expect(PLACEHOLDER_PATTERNS.some((re) => re.test("node_version: 20"))).toBe(false);
  });

  it("# Section Title is not a placeholder", () => {
    expect(PLACEHOLDER_PATTERNS.some((re) => re.test("# Section Title"))).toBe(false);
  });

  it("[link](url) is not a placeholder", () => {
    expect(PLACEHOLDER_PATTERNS.some((re) => re.test("[link](url)"))).toBe(false);
  });

  it("_hello world_ (English italics) is not a placeholder", () => {
    expect(PLACEHOLDER_PATTERNS.some((re) => re.test("_hello world_"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HTML comment with bracket-like content (stripComments edge case)
// ---------------------------------------------------------------------------

describe("HTML comments containing bracket patterns", () => {
  const raw = "<!-- As a [角色] I want [功能] -->";

  it("hasPlaceholders on raw content returns true", () => {
    expect(hasPlaceholders(raw)).toBe(true);
  });

  it("hasPlaceholders returns false after stripping HTML comments", () => {
    const stripped = raw.replace(/<!--[\s\S]*?-->/g, "");
    expect(hasPlaceholders(stripped)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// countPlaceholders
// ---------------------------------------------------------------------------

describe("countPlaceholders", () => {
  it("returns empty array for clean content", () => {
    expect(countPlaceholders("This is normal text without any placeholders.")).toEqual([]);
  });

  it("detects a single Chinese underscore placeholder", () => {
    const found = countPlaceholders("当前状态: _待定_");
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found).toContain("_待定_");
  });

  it("detects multiple placeholders across different patterns", () => {
    const found = countPlaceholders(
      "_待定_ [TODO] _5_ <!-- FILL-ME: --> [步骤]",
    );
    expect(found.length).toBeGreaterThanOrEqual(4);
    expect(found).toContain("_待定_");
    expect(found).toContain("[TODO]");
    expect(found).toContain("_5_");
    expect(found).toContain("[步骤]");
    // HTML comment pattern is more precise so may or may not match the
    // inline placement; the key question is 4+ distinct matches.
  });
});

// ---------------------------------------------------------------------------
// hasPlaceholders
// ---------------------------------------------------------------------------

describe("hasPlaceholders", () => {
  it("returns false for clean content", () => {
    expect(hasPlaceholders("This is a fully written section with real data.")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasPlaceholders("")).toBe(false);
  });

  it("returns true when content contains a Chinese underscore placeholder", () => {
    expect(hasPlaceholders("背景: _待补充_")).toBe(true);
  });

  it("returns true when content contains [TODO]", () => {
    expect(hasPlaceholders("Action: [TODO]")).toBe(true);
  });

  it("returns true when content contains a Chinese bracket placeholder", () => {
    expect(hasPlaceholders("参考 [量化] 指标。")).toBe(true);
  });

  it("returns true when content contains an HTML FILL-ME comment", () => {
    expect(hasPlaceholders("<!-- FILL-ME: -->")).toBe(true);
  });

  it("returns true when content contains _CI/CD_", () => {
    expect(hasPlaceholders("The pipeline uses _CI/CD_ integration.")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hasSubstantiveContent — per-phase mandatory section detection
// ---------------------------------------------------------------------------

describe("hasSubstantiveContent", () => {
  it("returns false for a phase with no mandatory headings and short body", () => {
    // 'integration' has no entry in MANDATORY_SECTION_HEADINGS,
    // so it falls back to strippedBodyOf(...).length > 80
    expect(hasSubstantiveContent("integration", "short")).toBe(false);
  });

  it("returns true for a phase with no mandatory headings and long substantive body", () => {
    const body =
      "This is a long paragraph that contains enough content to exceed eighty characters in the stripped body, so the fallback should return true for this test case.";
    expect(hasSubstantiveContent("integration", body)).toBe(true);
  });

  it("returns false when a mandatory section heading is missing", () => {
    expect(hasSubstantiveContent("change", "# Introduction\nSome text.")).toBe(false);
  });

  it("returns false when a mandatory section exists but only contains placeholders", () => {
    expect(hasSubstantiveContent("change", "## Scope\n[待定]")).toBe(false);
  });

  it("returns false when a mandatory section exists but cleaned content is too short", () => {
    expect(hasSubstantiveContent("change", "## Scope\nok")).toBe(false);
  });

  it("returns true when a mandatory section contains real substantive content", () => {
    const content = `## Motivation
This change will reduce page load time by removing the unnecessary synchronous API call that currently blocks the main rendering path.
`;
    expect(hasSubstantiveContent("change", content)).toBe(true);
  });

  it("returns true for design phase with a filled decision section", () => {
    const content = `## Decision
We will use PostgreSQL for the primary store because it supports full-text search natively, which eliminates the need for an external search service.
`;
    expect(hasSubstantiveContent("design", content)).toBe(true);
  });

  it("returns true for task phase with a filled slices section", () => {
    const content = `## Slices
- Slice 1: Add the database migration to create the new users table with all required columns and indexes.
`;
    expect(hasSubstantiveContent("task", content)).toBe(true);
  });

  it("returns true for requirement phase with a filled acceptance criteria section", () => {
    const content = `## Acceptance Criteria
- The login endpoint must return a JWT token when valid credentials are provided.
- The login endpoint must return 401 when credentials are invalid.
`;
    expect(hasSubstantiveContent("requirement", content)).toBe(true);
  });

  it("returns true for test phase with a filled test plan section", () => {
    const content = `## Test Plan
- Unit tests will cover all edge cases for the token validation logic.
- Integration tests will verify the full login flow against a real database.
`;
    expect(hasSubstantiveContent("test", content)).toBe(true);
  });

  it("returns false when mandatory section exists but placeholder text remains after stripping", () => {
    const content = "## Motivation\n[TODO]";
    expect(hasSubstantiveContent("change", content)).toBe(false);
  });
});
