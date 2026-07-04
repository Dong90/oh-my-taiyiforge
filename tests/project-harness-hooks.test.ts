import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  isNonMatchingProjectSkill,
  getAllProjectHooks,
} from "../src/integrations/project-harness-hooks.js";
import { resetProjectTechCache } from "../src/integrations/project-detect.js";

describe("project-harness-hooks", () => {
  describe("isNonMatchingProjectSkill", () => {
    it("returns false for empty tags (keep all hooks)", () => {
      expect(isNonMatchingProjectSkill("golang-patterns", [])).toBe(false);
      expect(isNonMatchingProjectSkill("typescript-patterns", [])).toBe(false);
      expect(isNonMatchingProjectSkill("any-skill", [])).toBe(false);
    });

    it("matches TypeScript skill with typescript tag", () => {
      expect(isNonMatchingProjectSkill("typescript-patterns", ["typescript"])).toBe(false);
      expect(isNonMatchingProjectSkill("typescript-ecosystem", ["typescript"])).toBe(false);
    });

    it("matches Go skill with go tag (golang→go mapping)", () => {
      expect(isNonMatchingProjectSkill("golang-patterns", ["go"])).toBe(false);
      expect(isNonMatchingProjectSkill("golang-testing", ["go"])).toBe(false);
    });

    it("filters golang skills for non-Go projects", () => {
      expect(isNonMatchingProjectSkill("golang-patterns", ["typescript"])).toBe(true);
      expect(isNonMatchingProjectSkill("golang-testing", ["python"])).toBe(true);
    });

    it("filters python skills for non-Python projects", () => {
      expect(isNonMatchingProjectSkill("python-patterns", ["go"])).toBe(true);
      expect(isNonMatchingProjectSkill("python-ecosystem", ["rust"])).toBe(true);
    });

    it("keeps non-language skills (unknown skills)", () => {
      expect(isNonMatchingProjectSkill("random-skill", ["typescript"])).toBe(false);
      expect(isNonMatchingProjectSkill("another-thing", ["go"])).toBe(false);
    });

    it("returns false for unknown skill (not a known prefix)", () => {
      expect(isNonMatchingProjectSkill("foobar", ["typescript"])).toBe(false);
    });

    it("works with multiple tags", () => {
      expect(isNonMatchingProjectSkill("golang-patterns", ["go", "typescript"])).toBe(false);
      expect(isNonMatchingProjectSkill("python-patterns", ["go", "typescript"])).toBe(true);
    });

    it("matches docker skill", () => {
      expect(isNonMatchingProjectSkill("docker-patterns", ["docker"])).toBe(false);
      expect(isNonMatchingProjectSkill("docker-patterns", ["typescript"])).toBe(true);
    });

    it("matches framework skills", () => {
      expect(isNonMatchingProjectSkill("react-patterns", ["react"])).toBe(false);
      expect(isNonMatchingProjectSkill("react-patterns", ["vue"])).toBe(true);
    });

    it("matches test framework skills", () => {
      expect(isNonMatchingProjectSkill("vitest-patterns", ["vitest"])).toBe(false);
      expect(isNonMatchingProjectSkill("vitest-patterns", ["jest"])).toBe(true);
    });

    it("matches database skills", () => {
      expect(isNonMatchingProjectSkill("prisma-patterns", ["prisma"])).toBe(false);
      expect(isNonMatchingProjectSkill("prisma-patterns", ["typeorm"])).toBe(true);
    });
  });

  describe("getAllProjectHooks", () => {
    let dir: string;

    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-ph-"));
      resetProjectTechCache();
    });

    afterEach(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("returns empty for empty project", () => {
      const hooks = getAllProjectHooks(dir, "dev");
      expect(hooks).toEqual([]);
    });

    it("returns TypeScript hooks for TS project at dev phase", () => {
      fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
      resetProjectTechCache();
      const hooks = getAllProjectHooks(dir, "dev");
      const skills = hooks.map((h) => h.skill);
      expect(skills).toContain("typescript-patterns");
      expect(skills).toContain("typescript-ecosystem");
    });

    it("returns TypeScript ecosystem hook at task phase", () => {
      fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
      resetProjectTechCache();
      const hooks = getAllProjectHooks(dir, "task");
      const skills = hooks.map((h) => h.skill);
      expect(skills).toContain("typescript-ecosystem");
      expect(skills).not.toContain("typescript-patterns");
    });

    it("returns Docker hooks at dev phase", () => {
      fs.writeFileSync(path.join(dir, "Dockerfile"), "FROM node:22");
      resetProjectTechCache();
      const hooks = getAllProjectHooks(dir, "dev");
      const skills = hooks.map((h) => h.skill);
      expect(skills).toContain("docker-patterns");
    });

    it("returns Docker hooks at test phase", () => {
      fs.writeFileSync(path.join(dir, "Dockerfile"), "FROM node:22");
      resetProjectTechCache();
      const hooks = getAllProjectHooks(dir, "test");
      const skills = hooks.map((h) => h.skill);
      expect(skills).toContain("docker-patterns");
    });

    it("returns no Docker hooks at design phase", () => {
      fs.writeFileSync(path.join(dir, "Dockerfile"), "FROM node:22");
      resetProjectTechCache();
      const hooks = getAllProjectHooks(dir, "design");
      expect(hooks).toEqual([]);
    });

    it("returns React hooks at ui-design phase", () => {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "test",
        dependencies: { react: "^18.0.0" },
      }));
      resetProjectTechCache();
      const hooks = getAllProjectHooks(dir, "ui-design");
      const skills = hooks.map((h) => h.skill);
      expect(skills).toContain("react-patterns");
    });

    it("hooks have required fields", () => {
      fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
      resetProjectTechCache();
      const hooks = getAllProjectHooks(dir, "dev");
      for (const h of hooks) {
        expect(h.tool).toBe("ecc");
        expect(h.skill).toBeTruthy();
        expect(h.when).toMatch(/^\[/);
        expect(h.optional).toBe(false);
      }
    });

    it("multi-tag project returns hooks for all dimensions", () => {
      fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
      fs.writeFileSync(path.join(dir, "Dockerfile"), "FROM node:22");
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "test",
        devDependencies: { vitest: "^1.0.0" },
      }));
      resetProjectTechCache();
      const hooks = getAllProjectHooks(dir, "dev");
      const skills = hooks.map((h) => h.skill);
      expect(skills.length).toBeGreaterThanOrEqual(4);
      expect(skills).toContain("typescript-patterns");
      expect(skills).toContain("docker-patterns");
      expect(skills).toContain("vitest-patterns");
    });
  });
});
