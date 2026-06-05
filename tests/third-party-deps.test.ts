import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  detectGstack,
  detectOpenspec,
  detectWebQualitySkills,
  findGstackDir,
  gstackSetupHostArgs,
  shouldInstallDeps,
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

  it("findGstackDir detects setup script", () => {
    const gstack = path.join(tmp, ".claude", "skills", "gstack");
    fs.mkdirSync(gstack, { recursive: true });
    fs.writeFileSync(path.join(gstack, "setup"), "#!/bin/bash\n");
    expect(findGstackDir(tmp)).toBe(gstack);
    expect(detectGstack(tmp).installed).toBe(true);
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

  it("gstackSetupHostArgs picks codex-only host", () => {
    const dir = path.join(tmp, "gstack");
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, "setup"), '--host cursor\nHOST="claude"\n');
    expect(gstackSetupHostArgs(dir, ["codex"])).toEqual(["--host", "codex"]);
  });

  it("detectOpenspec reflects PATH", () => {
    const r = detectOpenspec();
    expect(r.id).toBe("openspec");
    expect(typeof r.installed).toBe("boolean");
  });
});
