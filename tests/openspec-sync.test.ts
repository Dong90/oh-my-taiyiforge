import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { syncTaiyiToOpenspec } from "../src/integrations/openspec-sync.js";

describe("openspec-sync", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-sync-"));
    fs.mkdirSync(path.join(tmp, "openspec"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "openspec", "config.yaml"), "change_root: openspec/changes\n");
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("copies taiyi artifacts into openspec change dir", () => {
    const slug = "feat-x";
    const taiyiDir = path.join(tmp, ".taiyi", "changes", slug);
    fs.mkdirSync(taiyiDir, { recursive: true });
    fs.writeFileSync(path.join(taiyiDir, "CHANGE.md"), "# Change\n");
    fs.writeFileSync(path.join(taiyiDir, "DESIGN.md"), "# Design\n");

    const r = syncTaiyiToOpenspec(tmp, slug, taiyiDir, { createChangeDir: true });
    expect(r.ok).toBe(true);
    expect(r.copied).toContain("CHANGE.md → proposal.md");
    expect(r.copied).toContain("DESIGN.md → design.md");
    expect(fs.existsSync(path.join(tmp, "openspec", "changes", slug, "proposal.md"))).toBe(true);
  });

  it("skips existing files unless force", () => {
    const slug = "feat-y";
    const taiyiDir = path.join(tmp, ".taiyi", "changes", slug);
    const osDir = path.join(tmp, "openspec", "changes", slug);
    fs.mkdirSync(taiyiDir, { recursive: true });
    fs.mkdirSync(osDir, { recursive: true });
    fs.writeFileSync(path.join(taiyiDir, "CHANGE.md"), "NEW");
    fs.writeFileSync(path.join(osDir, "proposal.md"), "OLD");

    const r = syncTaiyiToOpenspec(tmp, slug, taiyiDir);
    expect(r.skippedFiles).toContain("proposal.md");
    expect(fs.readFileSync(path.join(osDir, "proposal.md"), "utf8")).toBe("OLD");

    const forced = syncTaiyiToOpenspec(tmp, slug, taiyiDir, { force: true });
    expect(forced.copied).toContain("CHANGE.md → proposal.md");
    expect(fs.readFileSync(path.join(osDir, "proposal.md"), "utf8")).toContain("NEW");
  });
});
