import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { seedChangeTemplates } from "../src/core/template-seed.js";

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
