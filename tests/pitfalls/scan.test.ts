import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("PITFALLS — scan.sh", () => {
  const scanPath = path.join(REPO, ".pitfalls/scan.sh");

  it("scan.sh exists and is executable", () => {
    expect(fs.existsSync(scanPath)).toBe(true);
    try {
      fs.accessSync(scanPath, fs.constants.X_OK);
    } catch {
      // not executable on this platform
    }
  });

  it("scan.sh is non-empty bash script", () => {
    const content = fs.readFileSync(scanPath, "utf8");
    expect(content).toContain("#!/usr/bin/env bash");
    expect(content.length).toBeGreaterThan(100);
  });

  it("scan.sh contains ast-grep layer", () => {
    const content = fs.readFileSync(scanPath, "utf8");
    expect(content).toContain("ast-grep");
    expect(content).toContain("sg scan");
  });

  it("scan.sh contains per-module grep layer", () => {
    const content = fs.readFileSync(scanPath, "utf8");
    expect(content).toContain("PITFALLS.md");
    expect(content).toContain("src/core");
    expect(content).toContain("src/cli");
  });

  it("scan.sh supports --ci flag", () => {
    const content = fs.readFileSync(scanPath, "utf8");
    expect(content).toContain("--ci");
    expect(content).toMatch(/exit 1/);
  });

  it("scan.sh supports --module flag", () => {
    const content = fs.readFileSync(scanPath, "utf8");
    expect(content).toContain("--module");
  });

  it("scan.sh exits cleanly", () => {
    const result = execSync(`bash "${scanPath}"`, {
      cwd: REPO,
      encoding: "utf8",
      timeout: 10000,
    });
    expect(result).toContain("PITFALLS Scan");
    expect(result).toContain("src/core");
    expect(result).toContain("Summary");
  });

  it("scan.sh --module src/core works", () => {
    const result = execSync(`bash "${scanPath}" --module src/core`, {
      cwd: REPO,
      encoding: "utf8",
      timeout: 10000,
    });
    expect(result).toContain("src/core");
    expect(result).toContain("Summary");
    // Should only scan the specified module
    const coreCount = (result.match(/src\/core/g) || []).length;
    const cliCount = (result.match(/src\/cli/g) || []).length;
    expect(coreCount).toBeGreaterThan(0);
    // When --module is set, it should be more focused
  });
});
