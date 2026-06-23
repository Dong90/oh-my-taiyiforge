import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  buildFrontmatter,
  extractFrontmatter,
  stripFrontmatter,
  injectFrontmatter,
} from "../../src/core/frontmatter.js";

describe("Frontmatter — YAML metadata for Markdown files", () => {
  const tmpDir = path.join(os.tmpdir(), "taiyi-test-fm-" + Date.now());
  beforeAll(() => fs.mkdirSync(tmpDir, { recursive: true }));
  afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  describe("buildFrontmatter", () => {
    it("produces valid YAML frontmatter block", () => {
      const fm = buildFrontmatter("change", "taiyi-change", "human", "CHANGE.md", [], ["requirement"]);
      expect(fm).toContain("---");
      expect(fm).toContain("phase: change");
      expect(fm).toContain("skill: taiyi-change");
      expect(fm).toContain("gate: human");
      expect(fm).toContain("upstream: []");
      expect(fm).toContain("downstream: [requirement]");
    });

    it("handles multiple upstream and downstream phases", () => {
      const fm = buildFrontmatter("integration", "taiyi-integration", "auto", "INTEGRATION.md", ["review", "dev", "test"], []);
      expect(fm).toContain("upstream: [review, dev, test]");
      expect(fm).toContain("downstream: []");
    });
  });

  describe("extractFrontmatter", () => {
    it("extracts phase metadata from frontmatter", () => {
      const fm = buildFrontmatter("change", "taiyi-change", "human", "CHANGE.md", [], ["requirement"]);
      const md = fm + "\n# CHANGE: Test\n\nContent here";
      const meta = extractFrontmatter(md);
      expect(meta).not.toBeNull();
      expect(meta!.phase).toBe("change");
      expect(meta!.skill).toBe("taiyi-change");
      expect(meta!.gate).toBe("human");
      expect(meta!.produces).toBe("CHANGE.md");
      expect(meta!.upstream).toEqual([]);
      expect(meta!.downstream).toEqual(["requirement"]);
    });

    it("returns null for plain Markdown without frontmatter", () => {
      const meta = extractFrontmatter("# Just a title\n\nContent");
      expect(meta).toBeNull();
    });

    it("handles empty frontmatter gracefully", () => {
      const meta = extractFrontmatter("---\n---\n# Title");
      expect(meta).toBeNull(); // no phase field
    });
  });

  describe("stripFrontmatter", () => {
    it("removes frontmatter block from Markdown", () => {
      const fm = buildFrontmatter("design", "taiyi-design", "human", "DESIGN.md", ["requirement"], ["ui-design", "task"]);
      const md = fm + "\n# DESIGN: My Design";
      const stripped = stripFrontmatter(md);
      expect(stripped).toContain("# DESIGN: My Design");
      expect(stripped).not.toContain("---");
    });

    it("returns original content if no frontmatter", () => {
      const md = "# Simple Title\nContent";
      expect(stripFrontmatter(md)).toBe(md);
    });
  });

  describe("injectFrontmatter", () => {
    it("injects frontmatter into existing MD files", () => {
      // Create a mini change directory
      const changeDir = path.join(tmpDir, "test-change");
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "# CHANGE: Test\nContent", "utf8");
      fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# REQUIREMENT: Test\nReq Content", "utf8");

      const result = injectFrontmatter(changeDir);
      expect(result.ok).toBe(true);
      expect(result.injected).toContain("CHANGE.md");
      expect(result.injected).toContain("REQUIREMENT.md");

      // Verify CHANGE.md now has frontmatter
      const changeMd = fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8");
      expect(changeMd).toContain("---");
      expect(changeMd).toContain("phase: change");
      expect(changeMd).toContain("# CHANGE: Test"); // original content preserved

      // Verify extraction works after injection
      const meta = extractFrontmatter(changeMd);
      expect(meta?.phase).toBe("change");
    });

    it("does not double-inject frontmatter", () => {
      const changeDir = path.join(tmpDir, "test-change-2");
      fs.mkdirSync(changeDir, { recursive: true });
      const fm = buildFrontmatter("change", "taiyi-change", "human", "CHANGE.md", [], ["requirement"]);
      fs.writeFileSync(path.join(changeDir, "CHANGE.md"), fm + "\n# CHANGE: Test", "utf8");

      const result = injectFrontmatter(changeDir);
      expect(result.injected).toEqual([]); // already has frontmatter
    });

    it("skips files that don't exist (graceful partial)", () => {
      const changeDir = path.join(tmpDir, "test-change-3");
      fs.mkdirSync(changeDir, { recursive: true });
      fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "# Only change", "utf8");
      // No REQUIREMENT.md — should still work for CHANGE.md

      const result = injectFrontmatter(changeDir);
      expect(result.ok).toBe(true);
      expect(result.injected).toEqual(["CHANGE.md"]);
    });
  });

  describe("frontmatter ↔ rendered MD roundtrip", () => {
    it("inject → extract → validates phase metadata for all 8 phases", () => {
      const changeDir = path.join(tmpDir, "roundtrip");
      fs.mkdirSync(changeDir, { recursive: true });
      const files: Record<string, string> = {
        "CHANGE.md": "# CHANGE: Roundtrip Test\nMotivation content",
        "REQUIREMENT.md": "# REQUIREMENT: Roundtrip\nAC content",
        "DESIGN.md": "# DESIGN: Roundtrip\nArchitecture content",
        "UI-DESIGN.md": "# UI-DESIGN: Roundtrip\nComponent content",
        "TASK.md": "# TASK: Roundtrip\nSlice content",
        "TEST.md": "# TEST: Roundtrip\nTest plan content",
        "REVIEW.md": "# REVIEW: Roundtrip\nReview content",
        "INTEGRATION.md": "# INTEGRATION: Roundtrip\nChangelog content",
      };
      for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(changeDir, name), content, "utf8");
      }

      const result = injectFrontmatter(changeDir);
      expect(result.ok).toBe(true);
      expect(result.injected.length).toBe(8);

      // Verify each file has correct metadata
      const expectedPhases: Record<string, { phase: string; gate: string }> = {
        "CHANGE.md": { phase: "change", gate: "human" },
        "REQUIREMENT.md": { phase: "requirement", gate: "auto" },
        "DESIGN.md": { phase: "design", gate: "human" },
        "UI-DESIGN.md": { phase: "ui-design", gate: "auto" },
        "TASK.md": { phase: "task", gate: "auto" },
        "TEST.md": { phase: "test", gate: "auto" },
        "REVIEW.md": { phase: "review", gate: "human" },
        "INTEGRATION.md": { phase: "integration", gate: "auto" },
      };

      for (const [name, expected] of Object.entries(expectedPhases)) {
        const content = fs.readFileSync(path.join(changeDir, name), "utf8");
        const meta = extractFrontmatter(content);
        expect(meta, `${name} should have metadata`).not.toBeNull();
        expect(meta!.phase, `${name} phase`).toBe(expected.phase);
        expect(meta!.gate, `${name} gate`).toBe(expected.gate);
        // Original content preserved
        expect(content).toContain(files[name].trim().slice(0, 20));
      }
    });
  });
});
