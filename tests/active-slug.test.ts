import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveActiveSlug, slugifyTitle } from "../src/core/active-slug.js";

describe("active-slug", () => {
  let tmp: string;
  let taiyiRoot: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-active-"));
    taiyiRoot = path.join(tmp, ".taiyi");
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function writeChange(slug: string, partial: Record<string, unknown>) {
    const dir = path.join(taiyiRoot, "changes", slug);
    fs.mkdirSync(dir, { recursive: true });
    const state = {
      slug,
      currentPhase: "change",
      completedPhases: [],
      profile: "full",
      updatedAt: new Date().toISOString(),
      ...partial,
    };
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify(state));
  }

  it("slugifyTitle from ascii", () => {
    expect(slugifyTitle("User Login")).toBe("user-login");
  });

  it("slugifyTitle from chinese uses ty- prefix", () => {
    expect(slugifyTitle("用户登录")).toMatch(/^ty-[a-z0-9]+$/);
  });

  it("resolveActiveSlug uses explicit slug", () => {
    const r = resolveActiveSlug(taiyiRoot, "my-fix");
    expect(r).toEqual({ ok: true, slug: "my-fix", inferred: false });
  });

  it("resolveActiveSlug rejects invalid explicit slug", () => {
    const r = resolveActiveSlug(taiyiRoot, "../bad");
    expect(r.ok).toBe(false);
  });

  it("resolveActiveSlug infers single active change", () => {
    writeChange("only-one", { updatedAt: "2026-06-05T10:00:00Z" });
    const r = resolveActiveSlug(taiyiRoot);
    expect(r.ok && r.slug).toBe("only-one");
    if (r.ok) expect(r.inferred).toBe(true);
  });

  it("resolveActiveSlug errors when multiple active", () => {
    writeChange("a", { updatedAt: "2026-06-05T11:00:00Z" });
    writeChange("b", { updatedAt: "2026-06-05T10:00:00Z" });
    const r = resolveActiveSlug(taiyiRoot);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("a");
  });

  it("resolveActiveSlug ignores aborted changes", () => {
    writeChange("aborted-one", {
      workflowStatus: "aborted",
      updatedAt: "2026-06-05T09:00:00Z",
    });
    writeChange("still-active", { updatedAt: "2026-06-05T10:00:00Z" });
    const r = resolveActiveSlug(taiyiRoot);
    expect(r.ok && r.slug).toBe("still-active");
  });
});
