import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("PITFALLS — GLOBAL.md", () => {
  const globalPath = path.join(REPO, ".pitfalls/GLOBAL.md");
  const content = fs.readFileSync(globalPath, "utf8");

  it("GLOBAL.md exists and is non-empty", () => {
    expect(fs.existsSync(globalPath)).toBe(true);
    expect(content.length).toBeGreaterThan(100);
  });

  it("contains tag index", () => {
    expect(content).toContain("标签索引");
    expect(content).toContain("arch");
    expect(content).toContain("sec");
  });

  it("contains module file list", () => {
    expect(content).toContain("模块 PITFALLS 文件清单");
    expect(content).toContain("src/core/PITFALLS.md");
    expect(content).toContain("src/cli/PITFALLS.md");
  });

  it("contains entry format spec", () => {
    expect(content).toContain("### P-XXX");
    expect(content).toContain("首发");
    expect(content).toContain("适用栈");
    expect(content).toContain("状态");
  });

  it("contains inclusion criteria", () => {
    expect(content).toContain("入库条件");
    expect(content).toContain("调试/试错耗时 > 30 分钟");
  });

  it("contains G-series global entries", () => {
    expect(content).toMatch(/### G-00[1-9]/);
  });

  it("G-001 prohibits Friday deploys", () => {
    expect(content).toContain("周五下午 4 点后不发版");
    expect(content).toMatch(/关键词.*deploy.*friday/);
  });

  it("G-002 requires npm audit before release", () => {
    expect(content).toContain("npm audit");
    expect(content).toMatch(/关键词.*npm audit.*security/);
  });

  it("G-003 requires CI green before merge", () => {
    expect(content).toContain("CI 全绿");
    expect(content).toMatch(/关键词.*ci.*merge.*e2e/);
  });
});

describe("PITFALLS — per-module files", () => {
  const modules = ["src/core", "src/cli", "src/templates", "src/schemas", "src/install", "src/integrations"];
  const entryPattern = /^### [CGISTCLIINT]+-\d+/m;

  for (const mod of modules) {
    const filePath = path.join(REPO, mod, "PITFALLS.md");
    const exists = fs.existsSync(filePath);
    const content = exists ? fs.readFileSync(filePath, "utf8") : "";

    it(`${mod}/PITFALLS.md exists`, () => {
      expect(exists).toBe(true);
      expect(content.length).toBeGreaterThan(50);
    });

    it(`${mod}/PITFALLS.md has entry format`, () => {
      if (!exists) return;
      expect(content).toMatch(entryPattern);
    });

    it(`${mod}/PITFALLS.md entries have required fields`, () => {
      if (!exists) return;
      for (const entry of content.match(/^### [CGISTCLIINT]+-\d+/gm) ?? []) {
        const block = content.slice(content.indexOf(entry), content.indexOf("###", content.indexOf(entry) + 1) || undefined);
        expect(block).toContain("首发");
        expect(block).toContain("适用栈");
        expect(block).toContain("状态");
        expect(block).toContain("关键词");
      }
    });

    it(`${mod}/PITFALLS.md all entries are active or have resolution`, () => {
      if (!exists) return;
      expect(content).toMatch(/- \*\*状态\*\*: active/);
    });
  }
});

describe("PITFALLS — entry counts", () => {
  it("core has 4 entries", () => {
    const content = fs.readFileSync(path.join(REPO, "src/core/PITFALLS.md"), "utf8");
    const entries = content.match(/^### C-\d+/gm) ?? [];
    expect(entries.length).toBe(4);
  });

  it("cli has 2 entries", () => {
    const content = fs.readFileSync(path.join(REPO, "src/cli/PITFALLS.md"), "utf8");
    const entries = content.match(/^### CLI-\d+/gm) ?? [];
    expect(entries.length).toBe(2);
  });

  it("templates has 3 entries", () => {
    const content = fs.readFileSync(path.join(REPO, "src/templates/PITFALLS.md"), "utf8");
    const entries = content.match(/^### T-\d+/gm) ?? [];
    expect(entries.length).toBe(3);
  });

  it("schemas has 2 entries", () => {
    const content = fs.readFileSync(path.join(REPO, "src/schemas/PITFALLS.md"), "utf8");
    const entries = content.match(/^### S-\d+/gm) ?? [];
    expect(entries.length).toBe(2);
  });

  it("install has 2 entries", () => {
    const content = fs.readFileSync(path.join(REPO, "src/install/PITFALLS.md"), "utf8");
    const entries = content.match(/^### I-\d+/gm) ?? [];
    expect(entries.length).toBe(2);
  });

  it("integrations has 2 entries", () => {
    const content = fs.readFileSync(path.join(REPO, "src/integrations/PITFALLS.md"), "utf8");
    const entries = content.match(/^### INT-\d+/gm) ?? [];
    expect(entries.length).toBe(2);
  });

  it("GLOBAL has 3 entries", () => {
    const content = fs.readFileSync(path.join(REPO, ".pitfalls/GLOBAL.md"), "utf8");
    const entries = content.match(/^### G-\d+/gm) ?? [];
    expect(entries.length).toBe(3);
  });

  it("total entries across all modules = 18", () => {
    let total = 0;
    for (const file of [
      ".pitfalls/GLOBAL.md",
      "src/core/PITFALLS.md", "src/cli/PITFALLS.md",
      "src/templates/PITFALLS.md", "src/schemas/PITFALLS.md",
      "src/install/PITFALLS.md", "src/integrations/PITFALLS.md",
    ]) {
      const content = fs.readFileSync(path.join(REPO, file), "utf8");
      total += (content.match(/^### [CGISTCLIINT]+-\d+/gm) ?? []).length;
    }
    expect(total).toBe(18);
  });
});
