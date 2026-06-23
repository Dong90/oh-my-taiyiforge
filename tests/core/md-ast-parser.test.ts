import { describe, it, expect } from "vitest";
import { extractSectionAst, extractTitleAst, extractCheckboxesAst } from "../../src/core/md-ast-parser.js";

describe("Markdown AST Parser — robust section extraction", () => {
  const md = `# CHANGE: My Feature

## Motivation
Build something useful for users.
This spans multiple lines.

## Scope
- In: workflow engine
- Out: UI

## Risks
- **Risk 1**: E2E false positive
- **Risk 2**: Test timeout

## Success Criteria
- [x] All phases pass
- [ ] Performance < 60s
- [ ] No regressions
`;

  describe("extractSectionAst", () => {
    it("extracts section by heading text", () => {
      const section = extractSectionAst(md, "Motivation", 2);
      expect(section).toContain("Build something useful");
      expect(section).toContain("spans multiple lines");
    });

    it("extracts bulleted list section", () => {
      const section = extractSectionAst(md, "Scope", 3);
      expect(section).toContain("workflow engine");
      expect(section).toContain("UI");
    });

    it("respects maxLines", () => {
      const section = extractSectionAst(md, "Risks", 1);
      const lines = section.split("\n").filter(Boolean);
      expect(lines.length).toBeLessThanOrEqual(1);
    });

    it("returns empty for missing heading", () => {
      expect(extractSectionAst(md, "Nonexistent", 3)).toBe("");
    });

    it("handles headings with special characters", () => {
      const md2 = `# CHANGE: Test

## Step 4: Decision
Chose option B.
Reason: automated regression.

## Step 5: Implementation
Code here.
`;
      const section = extractSectionAst(md2, "Decision", 3);
      expect(section).toContain("Chose option B");
    });

    it("handles Chinese headings", () => {
      const md3 = `# CHANGE: 测试

## 问题场景
这是一个问题描述。

## 为什么不行
因为会导致错误。
`;
      const section = extractSectionAst(md3, "问题场景", 3);
      expect(section).toContain("这是一个问题描述");
    });
  });

  describe("extractTitleAst", () => {
    it("extracts title from H1", () => {
      expect(extractTitleAst(md)).toBe("My Feature");
    });

    it("strips prefix", () => {
      expect(extractTitleAst("# REQUIREMENT: Login Flow")).toBe("Login Flow");
    });

    it("handles plain title without prefix", () => {
      expect(extractTitleAst("# Just a Title")).toBe("Just a Title");
    });
  });

  describe("extractCheckboxesAst", () => {
    it("extracts checked and unchecked items", () => {
      const items = extractCheckboxesAst(md, 5);
      expect(items).toContain("✓ All phases pass");
      expect(items).toContain("○ Performance < 60s");
      expect(items).toContain("○ No regressions");
    });

    it("respects maxItems", () => {
      const items = extractCheckboxesAst(md, 1);
      expect(items.length).toBe(1);
    });
  });
});
