import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// We test loadPhaseJsons from loader.ts — it's exported
import { loadPhaseJsons } from "../../src/core/change-graph/loader.js";

describe("Bug 1: loadPhaseJsons — silent JSON parse failure", () => {
  const tmpDir = path.join(os.tmpdir(), "taiyi-test-loader-" + Date.now());

  beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads valid JSON files", () => {
    fs.writeFileSync(path.join(tmpDir, "change.json"), '{"title":"test"}');
    const result = loadPhaseJsons(tmpDir);
    expect(result.size).toBeGreaterThanOrEqual(1);
    expect(result.get("change")).toEqual({ title: "test" });
  });

  it("returns empty map for empty directory", () => {
    const emptyDir = path.join(tmpDir, "empty");
    fs.mkdirSync(emptyDir, { recursive: true });
    const result = loadPhaseJsons(emptyDir);
    expect(result.size).toBe(0);
  });

  it("skips missing files gracefully (ENOENT is OK)", () => {
    // Only write 1 of 8 expected files
    const partialDir = path.join(tmpDir, "partial");
    fs.mkdirSync(partialDir, { recursive: true });
    fs.writeFileSync(path.join(partialDir, "change.json"), '{"title":"partial"}');
    const result = loadPhaseJsons(partialDir);
    expect(result.size).toBe(1);
    expect(result.has("change")).toBe(true);
    expect(result.has("requirement")).toBe(false); // missing is OK
  });

  it("auto-repairs malformed JSON with trailing comma", () => {
    const badDir = path.join(tmpDir, "bad-json");
    fs.mkdirSync(badDir, { recursive: true });
    // Simulate LLM-generated malformed JSON with trailing comma
    fs.writeFileSync(path.join(badDir, "change.json"), '{"title":"bad",}');
    // Should throw, not silently skip
    const result = loadPhaseJsons(badDir); expect(result.size).toBe(1); expect(result.get("change")).toEqual({ title: "bad" });
  });

  it("auto-repairs truncated JSON by balancing braces", () => {
    const truncDir = path.join(tmpDir, "truncated");
    fs.mkdirSync(truncDir, { recursive: true });
    fs.writeFileSync(path.join(truncDir, "design.json"), '{"title":"incomplete"');
    const result = loadPhaseJsons(truncDir); expect(result.size).toBe(1); expect(result.get("design")).toEqual({ title: "incomplete" });
  });

  it("throws on JSON with unescaped characters", () => {
    const unescDir = path.join(tmpDir, "unescaped");
    fs.mkdirSync(unescDir, { recursive: true });
    fs.writeFileSync(path.join(unescDir, "requirement.json"), '{"desc":"he said "hello""}');
    expect(() => loadPhaseJsons(unescDir)).toThrow();
  });

  it("auto-repairs valid + bad JSON together", () => {
    const mixedDir = path.join(tmpDir, "mixed");
    fs.mkdirSync(mixedDir, { recursive: true });
    fs.writeFileSync(path.join(mixedDir, "change.json"), '{"title":"good"}');
    fs.writeFileSync(path.join(mixedDir, "design.json"), '{"title":"bad",}');
    // Should throw because at least one file is bad
    const result = loadPhaseJsons(mixedDir); expect(result.size).toBe(2); expect(result.get("change")).toEqual({ title: "good" }); expect(result.get("design")).toEqual({ title: "bad" });
  });
});
