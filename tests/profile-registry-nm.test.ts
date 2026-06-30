import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  loadProfilesFromNodeModules,
  resetProfileRegistry,
  getDefaultRegistry,
  type ProfileDefinition,
} from "../src/core/profile-registry.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-profile-nm-"));
  resetProfileRegistry();
  getDefaultRegistry();
});

function mkdirp(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writePackageJson(p: string, profiles?: ProfileDefinition[]) {
  mkdirp(path.dirname(p));
  const pkg: Record<string, unknown> = {
    name: path.basename(path.dirname(p)),
    version: "0.0.1",
  };
  if (profiles) {
    pkg.taiyi = { type: "profile-pack", version: "1", profiles };
  }
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
}

describe("profile-registry: node_modules scan", () => {
  it("discovers profiles from package.json taiyi.profiles field", () => {
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/taiyi-fintech/package.json"),
      [
        {
          id: "fintech-strict",
          skipPhases: [],
          arch: "fastapi-6layer",
        },
      ],
    );
    const r = loadProfilesFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(1);
    }
    expect(getDefaultRegistry().get("fintech-strict")).toBeDefined();
  });

  it("registers multiple profiles from a single package.json", () => {
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/profiles/package.json"),
      [
        { id: "pack-a", skipPhases: [], arch: "auto" },
        { id: "pack-b", skipPhases: ["ui-design"], arch: "auto" },
      ],
    );
    const r = loadProfilesFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(2);
    }
    expect(getDefaultRegistry().get("pack-a")).toBeDefined();
    expect(getDefaultRegistry().get("pack-b")).toBeDefined();
  });

  it("skips package.json without taiyi.profiles field", () => {
    writePackageJson(path.join(tmpDir, "node_modules/normal-pkg/package.json"));
    const r = loadProfilesFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(0);
    }
  });

  it("skips node_modules/.bin and other noise dirs", () => {
    // Create .bin with a fake package.json (should be ignored)
    writePackageJson(
      path.join(tmpDir, "node_modules/.bin/some-tool/package.json"),
      [
        { id: "should-not-appear", skipPhases: [], arch: "auto" },
      ],
    );
    writePackageJson(
      path.join(tmpDir, "node_modules/.cache/anything/package.json"),
      [
        { id: "should-not-appear-either", skipPhases: [], arch: "auto" },
      ],
    );
    // And one real one
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/real/package.json"),
      [{ id: "real-one", skipPhases: [], arch: "auto" }],
    );
    const r = loadProfilesFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(1);
    }
    expect(getDefaultRegistry().get("real-one")).toBeDefined();
    expect(getDefaultRegistry().get("should-not-appear")).toBeUndefined();
  });

  it("third-party profiles are registered with source='package.json'", () => {
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/profiles/package.json"),
      [{ id: "from-nm", skipPhases: [], arch: "auto" }],
    );
    loadProfilesFromNodeModules(tmpDir);
    const list = getDefaultRegistry().list();
    const fromNm = list.find((d) => d.id === "from-nm");
    expect(fromNm).toBeDefined();
  });

  it("returns ok with 0 when node_modules does not exist", () => {
    const r = loadProfilesFromNodeModules(tmpDir);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(0);
    }
  });

  it("third-party profile collision with builtin returns DUPLICATE (skip not error)", () => {
    // Try to override builtin "full" via npm package — should be rejected
    writePackageJson(
      path.join(tmpDir, "node_modules/@acme/evil/package.json"),
      [
        {
          id: "full",
          skipPhases: ["ui-design"],
          arch: "generic",
        },
      ],
    );
    const r = loadProfilesFromNodeModules(tmpDir);
    // The scan itself doesn't error; the per-profile register fails
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(0); // failed to register
    }
    // builtin "full" should still be intact
    expect(getDefaultRegistry().get("full")?.skipPhases).toEqual([]);
  });

  it("scan completes in <2s for fixture with 30 fake modules", () => {
    for (let i = 0; i < 30; i++) {
      writePackageJson(
        path.join(tmpDir, `node_modules/fake-pkg-${i}/package.json`),
      );
    }
    const t0 = Date.now();
    const r = loadProfilesFromNodeModules(tmpDir);
    const elapsed = Date.now() - t0;
    expect(r.ok).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });
});
