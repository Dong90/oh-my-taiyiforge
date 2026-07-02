import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { TAIYI_SEED_MARKER } from "../src/core/seed-marker.js";
import {
  seedChangeTemplates,
  seedPhaseTemplate,
} from "../src/core/template-seed.js";

const HBS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/templates",
);

describe("template-seed", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-seed-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("canonical seed: json + hbs-rendered CHANGE.md on init", () => {
    const templates = path.join(tmp, "templates");
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(templates);
    fs.mkdirSync(changeDir);

    const seeded = seedChangeTemplates(changeDir, templates, {
      slug: "auth-timeout",
      title: "Auth Timeout",
    });

    expect(seeded).toContain("CHANGE.md");
    expect(seeded).toContain("change.json");
    const content = fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8");
    expect(content).toContain("Auth Timeout");
    expect(content).toContain("auth-timeout");
    expect(content).toContain(TAIYI_SEED_MARKER);
    expect(fs.existsSync(path.join(changeDir, "change.json"))).toBe(true);
  });

  it("legacy: copies markdown templates when hbs seed disabled", () => {
    const templates = path.join(tmp, "templates");
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(templates);
    fs.mkdirSync(changeDir);
    fs.writeFileSync(
      path.join(templates, "CHANGE.md"),
      "# CHANGE: {{title}}\n\n## Motivation\nfor {{slug}}\n",
    );

    const seeded = seedChangeTemplates(
      changeDir,
      templates,
      { slug: "auth-timeout", title: "Auth Timeout" },
      { hbsTemplatesDir: null },
    );

    expect(seeded).toContain("CHANGE.md");
    expect(seeded).not.toContain("change.json");
    const content = fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8");
    expect(content).toContain("Auth Timeout");
    expect(content).toContain("auth-timeout");
    expect(content).not.toContain("{{title}}");
    expect(content).toContain(TAIYI_SEED_MARKER);
  });

  it("init seeds only CHANGE.md by default, not TASK or CONTEXT", () => {
    const templates = path.join(tmp, "templates");
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(templates);
    fs.mkdirSync(changeDir);
    for (const f of ["CHANGE.md", "TASK.md", "CONTEXT.md"]) {
      fs.writeFileSync(path.join(templates, f), `# ${f}\n{{title}}\n`);
    }

    const seeded = seedChangeTemplates(
      changeDir,
      templates,
      { slug: "x", title: "X" },
      { hbsTemplatesDir: null },
    );
    expect(seeded).toEqual(["CHANGE.md"]);
    expect(fs.existsSync(path.join(changeDir, "TASK.md"))).toBe(false);
    expect(fs.existsSync(path.join(changeDir, "CONTEXT.md"))).toBe(false);
  });

  it("seedPhaseTemplate adds next phase artifact (canonical)", () => {
    const templates = path.join(tmp, "templates");
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(templates);
    fs.mkdirSync(changeDir);

    const out = seedPhaseTemplate(changeDir, templates, "requirement", {
      slug: "feat",
      title: "Feat",
    });
    expect(out).toBe("REQUIREMENT.md");
    expect(fs.readFileSync(path.join(changeDir, "REQUIREMENT.md"), "utf8")).toContain(
      TAIYI_SEED_MARKER,
    );
    expect(fs.existsSync(path.join(changeDir, "requirement.json"))).toBe(true);
  });

  it("does not overwrite user-written artifact on seedPhaseTemplate", () => {
    const templates = path.join(tmp, "templates");
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(templates);
    fs.mkdirSync(changeDir);
    fs.writeFileSync(
      path.join(templates, "REQUIREMENT.md"),
      "# REQUIREMENT: {{title}}\n",
    );
    fs.writeFileSync(
      path.join(changeDir, "REQUIREMENT.md"),
      "# REQUIREMENT\n\nUser wrote this before continue.\n",
    );

    const out = seedPhaseTemplate(
      changeDir,
      templates,
      "requirement",
      { slug: "feat", title: "Feat" },
      null,
    );
    expect(out).toBeNull();
    expect(fs.readFileSync(path.join(changeDir, "REQUIREMENT.md"), "utf8")).toContain(
      "User wrote this before continue",
    );
  });

  it("does not overwrite existing artifacts", () => {
    const templates = path.join(tmp, "templates");
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(templates);
    fs.mkdirSync(changeDir);
    fs.writeFileSync(path.join(templates, "CHANGE.md"), "TEMPLATE");
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "EXISTING");

    const seeded = seedChangeTemplates(
      changeDir,
      templates,
      { slug: "x" },
      { hbsTemplatesDir: null },
    );
    expect(seeded).toEqual([]);
    expect(fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8")).toBe("EXISTING");
  });
});
