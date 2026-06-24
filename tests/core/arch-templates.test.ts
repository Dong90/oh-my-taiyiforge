import { describe, it, expect, beforeAll } from "vitest";
import { ARCH_TEMPLATES, getArchTemplate, detectArchTemplate } from "../../src/core/arch-templates.js";
import { resolveArchTemplateForChange } from "../../src/core/profile.js";
import type { ArchTemplateId, ArchitectureTemplate } from "../../src/core/types.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("ARCH_TEMPLATES", () => {
  const ids: ArchTemplateId[] = ["express-3layer", "fastapi-6layer", "react-component", "generic"];

  it("defines all 4 templates", () => {
    for (const id of ids) {
      expect(ARCH_TEMPLATES[id]).toBeDefined();
    }
  });

  it.each(ids)("template '%s' has a non-empty contextGuide", (id) => {
    const tpl = ARCH_TEMPLATES[id];
    expect(tpl.contextGuide).toBeDefined();
    expect(tpl.contextGuide!.length).toBeGreaterThan(10);
    // contextGuide must be plain text without markdown headings
    expect(tpl.contextGuide).not.toMatch(/^##+/m);
  });

  it.each(ids)("template '%s' contextGuide mentions id, minSourceFiles or production readiness", (id) => {
    const tpl = ARCH_TEMPLATES[id];
    const guide = tpl.contextGuide!;
    // Guide should contain concrete architecture guidance
    const hasContent =
      guide.includes("目录") ||
      guide.includes("模式") ||
      guide.includes("结构") ||
      guide.includes("约定");
    expect(hasContent).toBe(true);
  });
});

describe("getArchTemplate", () => {
  it("returns fastapi-6layer for known id", () => {
    const tpl = getArchTemplate("fastapi-6layer");
    expect(tpl.id).toBe("fastapi-6layer");
    expect(tpl.contextGuide).toBeDefined();
  });

  it("falls back to generic for unknown id", () => {
    const tpl = getArchTemplate("nonexistent" as ArchTemplateId);
    expect(tpl.id).toBe("generic");
    expect(tpl.contextGuide).toBeDefined();
  });
});

describe("detectArchTemplate", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arch-test-"));
  });

  it("detects fastapi from requirements.txt", () => {
    const dir = path.join(tmpDir, "fastapi-proj");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "requirements.txt"), "fastapi\nuvicorn\npydantic");
    expect(detectArchTemplate(dir)).toBe("fastapi-6layer");
  });

  it("detects express from package.json", () => {
    const dir = path.join(tmpDir, "express-proj");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ dependencies: { express: "^4.18" } })
    );
    expect(detectArchTemplate(dir)).toBe("express-3layer");
  });

  it("detects react from package.json", () => {
    const dir = path.join(tmpDir, "react-proj");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ dependencies: { react: "^18", "react-dom": "^18" } })
    );
    expect(detectArchTemplate(dir)).toBe("react-component");
  });

  it("falls back to generic for unknown project", () => {
    const dir = path.join(tmpDir, "empty-proj");
    fs.mkdirSync(dir, { recursive: true });
    expect(detectArchTemplate(dir)).toBe("generic");
  });
});

describe("resolveArchTemplateForChange", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arch-resolve-"));
    // Set up a FastAPI project — requirements.txt must be at root
    fs.writeFileSync(
      path.join(tmpDir, "requirements.txt"),
      "fastapi\nuvicorn"
    );
  });

  it("returns template with contextGuide for api profile", () => {
    const tpl = resolveArchTemplateForChange("api", tmpDir);
    expect(tpl.id).toBe("fastapi-6layer");
    expect(tpl.contextGuide).toBeDefined();
    expect(tpl.contextGuide!.length).toBeGreaterThan(10);
  });

  it("returns template with contextGuide for full profile", () => {
    const tpl = resolveArchTemplateForChange("full", tmpDir);
    expect(tpl.contextGuide).toBeDefined();
  });

  it("returns template with contextGuide for ui profile", () => {
    const tpl = resolveArchTemplateForChange("ui", tmpDir);
    expect(tpl.contextGuide).toBeDefined();
    // UI profile uses "auto" — template depends on workspace detection
  });

  it("returns template with contextGuide for lite profile", () => {
    const tpl = resolveArchTemplateForChange("lite", tmpDir);
    expect(tpl.contextGuide).toBeDefined();
  });

  it("all templates have contextGuide mentioning expectedDirs", () => {
    // Every non-generic template should mention its dirs in contextGuide
    for (const [id, tpl] of Object.entries(ARCH_TEMPLATES)) {
      if (id === "generic") continue;
      if (tpl.expectedDirs.length > 0) {
        const guide = tpl.contextGuide ?? "";
        const mentionsDir = tpl.expectedDirs.some((d) => guide.includes(d));
        expect(mentionsDir).toBe(true);
      }
    }
  });
});
