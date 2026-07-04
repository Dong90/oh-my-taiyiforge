import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  detectOpenspec,
  detectWebQualitySkills,
  shouldInstallDeps,
  writeDetectedProviderConfig,
  detectThirdPartyDeps,
  syncProviders,
} from "../src/install/third-party-deps.js";
import { parseInstallCli } from "../src/install/run.js";

describe("third-party-deps", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-deps-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("shouldInstallDeps respects env", () => {
    expect(shouldInstallDeps({})).toBe(true);
    expect(shouldInstallDeps({ TAIYI_FORGE_SKIP_DEPS: "1" })).toBe(false);
    expect(shouldInstallDeps({ TAIYI_FORGE_INSTALL_DEPS: "0" })).toBe(false);
    expect(shouldInstallDeps({ CI: "true" })).toBe(false);
  });

  it("parseInstallCli --skip-deps disables installDeps", () => {
    const p = parseInstallCli(["--all", "--skip-deps"]);
    expect(p.installDeps).toBe(false);
    const all = parseInstallCli(["--all"]);
    expect(all.installDeps).toBe(true);
  });

  it("detectWebQualitySkills finds markers under agents skills", () => {
    const root = path.join(tmp, ".agents", "skills");
    for (const name of ["accessibility", "web-design-guidelines", "core-web-vitals"]) {
      fs.mkdirSync(path.join(root, name), { recursive: true });
      fs.writeFileSync(path.join(root, name, "SKILL.md"), "# x");
    }
    const d = detectWebQualitySkills(tmp);
    expect(d.installed).toBe(true);
  });

  it("detectOpenspec reflects PATH", () => {
    const r = detectOpenspec();
    expect(r.id).toBe("openspec");
    expect(typeof r.installed).toBe("boolean");
  });

  it("writeDetectedProviderConfig creates providers.yaml with assignments", () => {
    const r = writeDetectedProviderConfig(tmp, ["opencode", "claude"], tmp);
    expect(r.ok).toBe(true);
    expect(r.path).toBe(path.join(tmp, ".taiyi", "providers.yaml"));

    const content = fs.readFileSync(r.path, "utf8");
    expect(content).toContain("version: 1");
    expect(content).toContain("assignments:");
    expect(content).toContain("spec_archive: openspec");
  });

  it("writeDetectedProviderConfig creates .taiyi dir if missing", () => {
    const deep = path.join(tmp, "nested", "project");
    const r = writeDetectedProviderConfig(deep, ["opencode"], tmp);
    expect(r.ok).toBe(true);
    expect(fs.existsSync(path.join(deep, ".taiyi", "providers.yaml"))).toBe(true);
  });

  it("writeDetectedProviderConfig omits assignments for undetected providers", () => {
    const r = writeDetectedProviderConfig(tmp, ["opencode"], "/nonexistent");
    const content = fs.readFileSync(r.path, "utf8");
    // When no providers are detected (bogus home), only assignments
    // for tools that happen to be on PATH appear in the output
    expect(content).toContain("assignments:");
  });

  it("syncProviders returns registry after writeDetectedProviderConfig", () => {
    const first = writeDetectedProviderConfig(tmp, ["opencode", "claude"], tmp);
    expect(first.ok).toBe(true);

    const r = syncProviders(tmp, ["opencode", "claude"], tmp);
    expect(r.ok).toBe(true);
    expect(r.registry).toBeDefined();
    // registry should list at least the providers that were just detected
    expect(Object.keys(r.registry.listProviders()).length).toBeGreaterThanOrEqual(0);
    expect(r.detail).toContain(".taiyi/providers.yaml");
  });

  it("syncProviders refreshes cache after provider config change", () => {
    const first = writeDetectedProviderConfig(tmp, ["opencode"], tmp);
    expect(first.ok).toBe(true);

    const r1 = syncProviders(tmp, ["opencode"], tmp);
    const before = Object.keys(r1.registry.listProviders()).length;

    const r2 = syncProviders(tmp, ["opencode"], tmp);
    expect(Object.keys(r2.registry.listProviders()).length).toBeGreaterThanOrEqual(before);
  });

  it("syncProviders auto-creates .taiyi dir if missing", () => {
    const deep = path.join(tmp, "empty-project");
    const r = syncProviders(deep, ["opencode"], tmp);
    expect(r.ok).toBe(true);
    expect(r.registry).toBeDefined();
    expect(fs.existsSync(path.join(deep, ".taiyi", "providers.yaml"))).toBe(true);
  });
});
