import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getHarnessContext } from "../src/integrations/harness-hooks.js";
import { resetProjectTechCache } from "../src/integrations/project-detect.js";
import { resetWorkflowManifestCache } from "../src/integrations/workflow-manifest.js";

describe("harness-hooks tech detection", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-tech-"));
    resetProjectTechCache();
    resetWorkflowManifestCache();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("injects TypeScript hooks at dev phase", () => {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    resetProjectTechCache();
    const ctx = getHarnessContext(dir, "test-slug", "dev");
    const skills = ctx.hooks.map((h) => h.skill);
    expect(skills).toContain("typescript-patterns");
    expect(skills).toContain("typescript-ecosystem");
  });

  it("does NOT inject golang hooks for TS project", () => {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    resetProjectTechCache();
    const ctx = getHarnessContext(dir, "test-slug", "dev");
    const skills = ctx.hooks.filter((h) => h.skill?.startsWith("golang"));
    expect(skills).toEqual([]);
  });

  it("injects Docker hooks", () => {
    fs.writeFileSync(path.join(dir, "Dockerfile"), "FROM node:22");
    resetProjectTechCache();
    const ctx = getHarnessContext(dir, "test-slug", "dev");
    const skills = ctx.hooks.map((h) => h.skill);
    expect(skills).toContain("docker-patterns");
  });

  it("injects Vitest hooks for task phase", () => {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: "test",
      devDependencies: { vitest: "^1.0.0" },
    }));
    resetProjectTechCache();
    const ctx = getHarnessContext(dir, "test-slug", "task");
    const skills = ctx.hooks.map((h) => h.skill);
    expect(skills).toContain("vitest-patterns");
  });

  it("includes tech stack note in context notes", () => {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    resetProjectTechCache();
    const ctx = getHarnessContext(dir, "test-slug", "dev");
    expect(ctx.notes.some((n) => n.includes("lang:typescript"))).toBe(true);
  });

  it("shows unknown tech stack note for empty project", () => {
    const ctx = getHarnessContext(dir, "test-slug", "dev");
    expect(ctx.notes.some((n) => n.includes("未检测到"))).toBe(true);
  });

  it("project hooks have [tag] prefix in when field", () => {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    resetProjectTechCache();
    const ctx = getHarnessContext(dir, "test-slug", "dev");
    const auto = ctx.hooks.filter((h) => /^\[/.test(h.when));
    expect(auto.length).toBeGreaterThan(0);
    for (const h of auto) {
      expect(h.optional).toBe(false);
    }
  });

  it("project hooks are deduplicated with manifest hooks", () => {
    fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");
    resetProjectTechCache();
    const ctx = getHarnessContext(dir, "test-slug", "dev");
    const tsPatterns = ctx.hooks.filter(
      (h) => h.skill === "typescript-patterns",
    );
    expect(tsPatterns.length).toBe(1);
  });
});
