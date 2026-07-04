import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { ChangeSchema } from "../src/schemas/change.js";
import { RequirementSchema } from "../src/schemas/requirement.js";
import { TAIYI_SEED_MARKER } from "../src/core/seed-marker.js";
import {
  buildSeedJson,
  renderPhaseMarkdown,
  seedPhaseArtifacts,
} from "../src/core/artifact-seed.js";

const HBS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/templates",
);

describe("artifact-seed", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-artifact-seed-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("buildSeedJson(change) produces Zod-valid minimal json", () => {
    const json = buildSeedJson("change", { slug: "auth-timeout", title: "Auth Timeout" });
    expect(() => ChangeSchema.parse(json)).not.toThrow();
    expect(json.title).toBe("Auth Timeout");
  });

  it("buildSeedJson(requirement) produces Zod-valid minimal json", () => {
    const json = buildSeedJson("requirement", { slug: "feat", title: "Feat" });
    expect(() => RequirementSchema.parse(json)).not.toThrow();
  });

  it("renderPhaseMarkdown renders CHANGE.md from change.hbs with slug/title", () => {
    const json = buildSeedJson("change", { slug: "auth-timeout", title: "Auth Timeout" });
    const md = renderPhaseMarkdown("change", json, HBS_DIR, {
      slug: "auth-timeout",
      title: "Auth Timeout",
    });
    expect(md).toContain("# CHANGE: Auth Timeout");
    expect(md).toContain("auth-timeout");
    expect(md).not.toContain("{{title}}");
  });

  it("seedPhaseArtifacts writes change.json + CHANGE.md with seed marker", () => {
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(changeDir);

    const out = seedPhaseArtifacts(changeDir, HBS_DIR, "change", {
      slug: "auth-timeout",
      title: "Auth Timeout",
    });

    expect(out).toEqual({ json: "change.json", markdown: "CHANGE.md" });
    const md = fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8");
    const json = JSON.parse(fs.readFileSync(path.join(changeDir, "change.json"), "utf8"));
    expect(md).toContain(TAIYI_SEED_MARKER);
    expect(() => ChangeSchema.parse(json)).not.toThrow();
    expect(fs.existsSync(path.join(changeDir, ".taiyi", "snapshots", "change.hash"))).toBe(
      true,
    );
  });
});
