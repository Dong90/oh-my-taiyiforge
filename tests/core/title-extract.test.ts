import { describe, it, expect } from "vitest";

/**
 * Test: extractTitle should handle common LLM formatting variations.
 * Currently used in workflow-engine.ts completePhase to seed next phase template.
 */
function extractTitle(md: string): string | undefined {
  // Current implementation — too strict
  const m = md.match(/^#\s*CHANGE:\s*(.+)$/m);
  return m?.[1]?.trim();
}

function extractTitleRobust(md: string): string | undefined {
  // Robust version: handles all LLM formatting variations
  // Match "# CHANGE: xxx" | "# CHANGE：xxx" | "# **CHANGE**: xxx" | "## CHANGE: xxx"
  // Also handle "# Title" without prefix
  const patterns = [
    /^#{1,2}\s*(?:\*{0,2}(?:CHANGE|DESIGN|REQUIREMENT|UI-DESIGN|TASK|TEST|REVIEW|INTEGRATION)\*{0,2})\s*[:：]\s*(.+)$/m,
    /^#{1,2}\s*(.+)$/m, // Fallback: any H1/H2 heading
  ];
  for (const re of patterns) {
    const m = md.match(re);
    if (m) return m[1].trim();
  }
  return undefined;
}

describe("Bug 3: title extraction regex fragility", () => {
  // Current behavior tests (RED — some fail)
  describe("current implementation (buggy)", () => {
    it("matches standard format", () => {
      expect(extractTitle("# CHANGE: My Feature")).toBe("My Feature");
    });

    it("fails with Chinese colon  ： ", () => {
      // This is the bug — LLM may use Chinese colon
      expect(extractTitle("# CHANGE：My Feature")).toBeUndefined();
    });

    it("fails with bold markup  **CHANGE** ", () => {
      expect(extractTitle("# **CHANGE**: My Feature")).toBeUndefined();
    });

    it("fails with extra space", () => {
      // Should still work with extra space
      expect(extractTitle("#   CHANGE: My Feature")).toBe("My Feature");
    });

    it("DOES NOT match DESIGN prefix (known bug)", () => {
      // Current code only handles CHANGE prefix — DESIGN/TASK/etc silently fail
      expect(extractTitle("# DESIGN: Architecture")).toBeUndefined();
    });
  });

  // Robust implementation tests (GREEN)
  describe("robust implementation (fixed)", () => {
    it("handles Chinese colon", () => {
      expect(extractTitleRobust("# CHANGE：My Feature")).toBe("My Feature");
    });

    it("handles bold markup", () => {
      expect(extractTitleRobust("# **CHANGE**: Bold Feature")).toBe("Bold Feature");
    });

    it("handles double hash H2 heading", () => {
      expect(extractTitleRobust("## CHANGE: H2 Feature")).toBe("H2 Feature");
    });

    it("handles plain heading without prefix", () => {
      expect(extractTitleRobust("# Just a title")).toBe("Just a title");
    });

    it("handles integration prefix", () => {
      expect(extractTitleRobust("# INTEGRATION: My Release")).toBe("My Release");
    });

    it("handles multi-phase prefixes", () => {
      const prefixes = [
        "# CHANGE: Test Change",
        "# REQUIREMENT: Test Req",
        "# DESIGN: Test Design",
        "# UI-DESIGN: Test UI",
        "# TASK: Test Task",
        "# TEST: Test Test",
        "# REVIEW: Test Review",
        "# INTEGRATION: Test Integration",
      ];
      for (const p of prefixes) {
        const title = extractTitleRobust(p);
        expect(title).toBeTruthy();
        // Should NOT contain the prefix itself
        expect(title).not.toMatch(/^CHANGE|DESIGN|REQUIREMENT|UI-DESIGN|TASK|TEST|REVIEW|INTEGRATION/);
      }
    });
  });
});
