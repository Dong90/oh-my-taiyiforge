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
import { autoFillJson } from "../src/core/json-auto-fill.js";

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

  it("complexity upgrade: low→medium re-render fills [MEDIUM+] fields", () => {
    // Step 1: simulate low complexity creation — user filled some data
    const userJson = {
      title: "Upgrade测试",
      one_liner: "测试复杂度升级",
      user_stories: [{ as_a: "用户", i_want: "登录", so_that: "安全", priority: "P0" }],
      functional_requirements: [{ module: "auth", items: [{ id: "FR-01", description: "新增功能" }] }],
      acceptance_criteria: [{ id: "AC-01", description: "功能可用", is_checked: false }],
    };
    expect("shadow_paths" in userJson).toBe(false);
    expect("error_rescue_map" in userJson).toBe(false);

    // Step 2: upgrade to medium complexity, re-render via autoFill
    const filled = autoFillJson("requirement", { ...userJson }, "upgrade-test", {
      level: "medium",
      score: 9,
    });

    // Verify [MEDIUM+] fields are now present
    expect("shadow_paths" in filled).toBe(true);
    expect("error_rescue_map" in filled).toBe(true);
    expect("non_happy_path_cases" in filled).toBe(true);
    expect("dependencies" in filled).toBe(true);
    expect("non_functional" in filled).toBe(true);
    expect(filled.non_functional).toHaveProperty("availability");

    // Step 3: existing user data preserved
    expect(filled.title).toBe("Upgrade测试");
    expect(filled.user_stories[0].as_a).toBe("用户");
    expect(filled.functional_requirements[0].module).toBe("auth");

    // Step 4: Zod should accept the filled result
    expect(() => RequirementSchema.parse(filled)).not.toThrow();
  });

  it("complexity stay-low: autoFill with low complexity skips [MEDIUM+]", () => {
    const userJson = { title: "低复杂度" };
    const filled = autoFillJson("requirement", { ...userJson }, "low-test", {
      level: "low",
      score: 3,
    });
    expect("shadow_paths" in filled).toBe(false);
    expect("dependencies" in filled).toBe(false);
  });
});
