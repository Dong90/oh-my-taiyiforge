import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  loadCodePatternsFromNodeModules,
  resetDefaultCodePatternRegistry,
  getDefaultCodePatternRegistry,
  type CodePatternDefinition,
} from "../src/core/code-pattern-registry.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-pattern-nm-"));
  resetDefaultCodePatternRegistry();
  getDefaultCodePatternRegistry();
});

function mkdirp(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writePackageJson(p: string, patterns?: CodePatternDefinition[]) {
  mkdirp(path.dirname(p));
  const pkg: Record<string, unknown> = {
    name: path.basename(path.dirname(p)),
    version: "0.0.1",
  };
  if (patterns) {
    pkg.taiyi = { type: "code-pattern-pack", version: "1", patterns };
  }
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
}

describe("code-pattern-registry: node_modules scan", () => {
  it("discovers patterns from package.json taiyi.patterns field", () => {
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/code-patterns/package.json"),
      [
        { pattern: "DomainAdapter", templateFile: "domain-adapter.hbs" },
      ],
    );
    const r = loadCodePatternsFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(1);
    expect(getDefaultCodePatternRegistry().get("DomainAdapter")).toBeDefined();
  });

  it("skips package.json without taiyi.patterns field", () => {
    writePackageJson(path.join(tmpDir, "node_modules/normal-pkg/package.json"));
    const r = loadCodePatternsFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0);
  });

  it("skips node_modules/.bin and .cache", () => {
    writePackageJson(
      path.join(tmpDir, "node_modules/.bin/some-tool/package.json"),
      [{ pattern: "ShouldNotAppear", templateFile: "x.hbs" }],
    );
    writePackageJson(
      path.join(tmpDir, "node_modules/.cache/anything/package.json"),
      [{ pattern: "ShouldNotAppearEither", templateFile: "x.hbs" }],
    );
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/real/package.json"),
      [{ pattern: "RealOne", templateFile: "real.hbs" }],
    );
    const r = loadCodePatternsFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(1);
    expect(getDefaultCodePatternRegistry().get("RealOne")).toBeDefined();
    expect(getDefaultCodePatternRegistry().get("ShouldNotAppear")).toBeUndefined();
  });

  it("registers multiple patterns from single package.json", () => {
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/pack/package.json"),
      [
        { pattern: "PackA", templateFile: "a.hbs" },
        { pattern: "PackB", templateFile: "b.hbs", outputExtension: ".ts" },
      ],
    );
    const r = loadCodePatternsFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(2);
    expect(getDefaultCodePatternRegistry().get("PackA")).toBeDefined();
    expect(getDefaultCodePatternRegistry().get("PackB")?.outputExtension).toBe(".ts");
  });

  it("third-party pattern collision with builtin silently skipped", () => {
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/evil/package.json"),
      [{ pattern: "Adapter", templateFile: "evil.hbs" }],
    );
    const r = loadCodePatternsFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0);
    // builtin Adapter still intact
    expect(getDefaultCodePatternRegistry().get("Adapter")?.templateFile).toBe(
      "adapter.hbs",
    );
  });

  it("returns ok with 0 when node_modules does not exist", () => {
    const r = loadCodePatternsFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0);
  });

  it("scan completes in <2s for fixture with 30 fake modules", () => {
    for (let i = 0; i < 30; i++) {
      writePackageJson(path.join(tmpDir, `node_modules/fake-pkg-${i}/package.json`));
    }
    const t0 = Date.now();
    const r = loadCodePatternsFromNodeModules(tmpDir);
    const elapsed = Date.now() - t0;
    expect(r.ok).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });
});
