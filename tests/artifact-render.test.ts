import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { TAIYI_SEED_MARKER } from "../src/core/seed-marker.js";
import { seedPhaseArtifacts } from "../src/core/artifact-seed.js";
import { forceRenderPhaseFromJson } from "../src/core/artifact-render.js";
import { taiyiRender } from "../src/plugin/handlers.js";

const HBS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/templates",
);

describe("artifact-render", () => {
  let tmp: string;
  let changeDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-artifact-render-"));
    changeDir = path.join(tmp, "change");
    fs.mkdirSync(changeDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("forceRenderPhaseFromJson re-renders md from json without seed marker", () => {
    seedPhaseArtifacts(changeDir, HBS_DIR, "change", {
      slug: "feat",
      title: "Feat",
    });
    expect(fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8")).toContain(
      TAIYI_SEED_MARKER,
    );

    const jsonPath = path.join(changeDir, "change.json");
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    json.title = "Updated Feature";
    json.motivation = "Users need faster login.";
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));

    const r = forceRenderPhaseFromJson(changeDir, "change", HBS_DIR, { slug: "feat" });
    expect(r.ok).toBe(true);

    const md = fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8");
    expect(md).toContain("Updated Feature");
    expect(md).not.toContain(TAIYI_SEED_MARKER);
  });

  it("taiyiRender CLI handler renders current phase artifact", () => {
    const workspace = path.join(tmp, "ws");
    const taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes", "demo"), { recursive: true });
    fs.writeFileSync(
      path.join(taiyiRoot, "changes", "demo", "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "change",
        completedPhases: [],
        profile: "full",
        workflowStatus: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
    seedPhaseArtifacts(path.join(taiyiRoot, "changes", "demo"), HBS_DIR, "change", {
      slug: "demo",
      title: "Demo",
    });

    const jsonPath = path.join(taiyiRoot, "changes", "demo", "change.json");
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    json.motivation = "Demo motivation for render test.";
    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));

    const r = taiyiRender(workspace, "demo", "change");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.artifact).toBe("CHANGE.md");
      expect(r.text).toMatch(/CHANGE\.md/);
    }
  });
});
