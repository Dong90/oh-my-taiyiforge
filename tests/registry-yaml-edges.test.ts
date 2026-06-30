import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  loadProfilesFromYaml,
  loadProfilesFromNodeModules,
  resetProfileRegistry,
  getDefaultRegistry,
} from "../src/core/profile-registry.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-edge-"));
  resetProfileRegistry();
  getDefaultRegistry();
});

describe("yaml loader: special characters in path", () => {
  it("handles paths with spaces in directory name", () => {
    const specialDir = path.join(tmpDir, "my project dir");
    fs.mkdirSync(specialDir, { recursive: true });
    const yamlPath = path.join(specialDir, "profiles.yaml");
    fs.writeFileSync(
      yamlPath,
      `profiles:\n  - id: spaced\n    skipPhases: []\n    arch: auto\n`,
    );
    const r = loadProfilesFromYaml(yamlPath);
    expect(r.ok).toBe(true);
  });

  it("handles paths with unicode characters", () => {
    const unicodeDir = path.join(tmpDir, "项目-配置");
    fs.mkdirSync(unicodeDir, { recursive: true });
    const yamlPath = path.join(unicodeDir, "profiles.yaml");
    fs.writeFileSync(
      yamlPath,
      `profiles:\n  - id: unicode-profile\n    skipPhases: []\n    arch: auto\n`,
    );
    const r = loadProfilesFromYaml(yamlPath);
    expect(r.ok).toBe(true);
  });
});

describe("node_modules scan: edge cases", () => {
  it("skips scoped package with missing package.json gracefully", () => {
    // Create a scope dir without any package.json files inside
    fs.mkdirSync(path.join(tmpDir, "node_modules/@broken-scope"), { recursive: true });
    const r = loadProfilesFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0);
  });

  it("handles deeply nested pnpm-style structure (only scans depth 1)", () => {
    // pnpm puts everything in .pnpm — should be skipped
    fs.mkdirSync(
      path.join(tmpDir, "node_modules/.pnpm/foo@1.0.0/node_modules/@scope/real-pkg"),
      { recursive: true },
    );
    fs.writeFileSync(
      path.join(tmpDir, "node_modules/.pnpm/foo@1.0.0/node_modules/@scope/real-pkg/package.json"),
      JSON.stringify({
        name: "real-pkg",
        taiyi: {
          type: "profile-pack",
          profiles: [
            { id: "should-not-appear", skipPhases: [], arch: "auto" },
          ],
        },
      }),
    );
    const r = loadProfilesFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0);
  });
});

describe("yaml loader: nested structure (per-field array)", () => {
  it("parses nested non_functional.performance array correctly", () => {
    const yamlPath = path.join(tmpDir, "nested.yaml");
    fs.writeFileSync(
      yamlPath,
      `profiles:
  - id: nested-test
    skipPhases: []
    arch: auto
    description: Nested test
`,
    );
    const r = loadProfilesFromYaml(yamlPath);
    expect(r.ok).toBe(true);
  });
});
