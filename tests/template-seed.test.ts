import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { TAIYI_SEED_MARKER } from "../src/core/seed-marker.js";
import {
  seedChangeTemplates,
  seedPhaseTemplate,
} from "../src/core/template-seed.js";

describe("template-seed", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-seed-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("copies markdown templates with slug/title substitution", () => {
    const templates = path.join(tmp, "templates");
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(templates);
    fs.mkdirSync(changeDir);
    fs.writeFileSync(
      path.join(templates, "CHANGE.md"),
      "# CHANGE: {{title}}\n\n## Motivation\nfor {{slug}}\n",
    );

    const seeded = seedChangeTemplates(changeDir, templates, {
      slug: "auth-timeout",
      title: "Auth Timeout",
    });

    expect(seeded).toContain("CHANGE.md");
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

    const seeded = seedChangeTemplates(changeDir, templates, { slug: "x", title: "X" });
    expect(seeded).toEqual(["CHANGE.md"]);
    expect(fs.existsSync(path.join(changeDir, "TASK.md"))).toBe(false);
    expect(fs.existsSync(path.join(changeDir, "CONTEXT.md"))).toBe(false);
  });

  it("seedPhaseTemplate adds next phase artifact", () => {
    const templates = path.join(tmp, "templates");
    const changeDir = path.join(tmp, "change");
    fs.mkdirSync(templates);
    fs.mkdirSync(changeDir);
    fs.writeFileSync(
      path.join(templates, "REQUIREMENT.md"),
      "# REQUIREMENT: {{title}}\n",
    );

    const out = seedPhaseTemplate(changeDir, templates, "requirement", {
      slug: "feat",
      title: "Feat",
    });
    expect(out).toBe("REQUIREMENT.md");
    expect(fs.readFileSync(path.join(changeDir, "REQUIREMENT.md"), "utf8")).toContain(
      TAIYI_SEED_MARKER,
    );
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

    const out = seedPhaseTemplate(changeDir, templates, "requirement", {
      slug: "feat",
      title: "Feat",
    });
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

    const seeded = seedChangeTemplates(changeDir, templates, { slug: "x" });
    expect(seeded).toEqual([]);
    expect(fs.readFileSync(path.join(changeDir, "CHANGE.md"), "utf8")).toBe("EXISTING");
  });
});
