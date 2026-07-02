import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  buildSeedJson,
  seedPhaseArtifacts,
} from "../src/core/artifact-seed.js";
import { syncMarkdownFromJsonIfStale } from "../src/core/artifact-sync.js";

const HBS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/templates",
);

describe("artifact-sync", () => {
  let tmp: string;
  let changeDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-artifact-sync-"));
    changeDir = path.join(tmp, "change");
    fs.mkdirSync(changeDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("re-renders md when json changes but md still matches last snapshot", () => {
    const vars = { slug: "feat", title: "Original" };
    seedPhaseArtifacts(changeDir, HBS_DIR, "change", vars);

    const jsonPath = path.join(changeDir, "change.json");
    const updated = {
      ...JSON.parse(fs.readFileSync(jsonPath, "utf8")),
      title: "Updated Title",
    };
    fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2));

    const result = syncMarkdownFromJsonIfStale("change", changeDir, HBS_DIR);
    expect(result.rendered).toBe(true);

    const md = fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8");
    expect(md).toContain("Updated Title");
  });

  it("does not overwrite user-edited md when md diverged from snapshot", () => {
    const vars = { slug: "feat", title: "Feat" };
    seedPhaseArtifacts(changeDir, HBS_DIR, "change", vars);

    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      "# CHANGE: User Edit\n\n## Motivation\n\nHuman wrote this.\n",
    );

    const result = syncMarkdownFromJsonIfStale("change", changeDir, HBS_DIR);
    expect(result.rendered).toBe(false);
    expect(fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8")).toContain(
      "Human wrote this",
    );
  });

  it("renders when md missing but json exists", () => {
    const vars = { slug: "feat", title: "Only Json" };
    const json = buildSeedJson("change", vars);
    fs.writeFileSync(path.join(changeDir, "change.json"), JSON.stringify(json, null, 2));

    const result = syncMarkdownFromJsonIfStale("change", changeDir, HBS_DIR);
    expect(result.rendered).toBe(true);
    expect(fs.existsSync(path.join(changeDir, "CHANGE.md"))).toBe(true);
  });
});
