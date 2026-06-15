import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  archiveTaiyiChange,
  findExistingArchiveDirForSlug,
  isTaiyiArchived,
  resolveChangeDir,
  taiyiArchiveWhenOpenspecAlreadyDone,
} from "../src/core/taiyi-archive.js";
import { taiyiArchive } from "../src/plugin/handlers.js";
import { formatArchivePlain } from "../src/core/format-integration.js";
import * as openspec from "../src/integrations/openspec.js";

describe("taiyi-archive", () => {
  let tmp: string;
  let taiyiRoot: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-arch-"));
    taiyiRoot = path.join(tmp, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes", "demo"), { recursive: true });
    fs.writeFileSync(path.join(taiyiRoot, "changes", "demo", "state.json"), "{}");
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("archiveTaiyiChange moves active dir once", () => {
    const r = archiveTaiyiChange(taiyiRoot, "demo");
    expect(r.ok).toBe(true);
    expect(fs.existsSync(path.join(taiyiRoot, "changes", "demo"))).toBe(false);
    expect(fs.existsSync(path.join(taiyiRoot, "archive", "demo"))).toBe(true);
  });

  it("archiveTaiyiChange is idempotent when already in archive", () => {
    archiveTaiyiChange(taiyiRoot, "demo");
    fs.mkdirSync(path.join(taiyiRoot, "changes", "demo"), { recursive: true });
    fs.writeFileSync(path.join(taiyiRoot, "changes", "demo", "state.json"), "{}");
    const r = archiveTaiyiChange(taiyiRoot, "demo");
    expect(r.ok).toBe(true);
    expect(fs.existsSync(path.join(taiyiRoot, "changes", "demo"))).toBe(true);
    expect(r.reason).toMatch(/跳过重复移动|already/);
  });

  it("taiyiArchiveWhenOpenspecAlreadyDone keeps active changes dir", () => {
    const r = taiyiArchiveWhenOpenspecAlreadyDone(taiyiRoot, "demo");
    expect(r.ok).toBe(true);
    expect(fs.existsSync(path.join(taiyiRoot, "changes", "demo"))).toBe(true);
    expect(r.reason).toMatch(/仍在 .taiyi\/changes/);
  });

  it("resolveChangeDir prefers archive when active dir is empty shell", () => {
    archiveTaiyiChange(taiyiRoot, "demo");
    fs.mkdirSync(path.join(taiyiRoot, "changes", "demo"), { recursive: true });
    const dir = resolveChangeDir(taiyiRoot, "demo");
    expect(dir).toBe(path.join(taiyiRoot, "archive", "demo"));
  });

  it("resolveChangeDir prefers completed archive when active is stale re-init", () => {
    fs.writeFileSync(
      path.join(taiyiRoot, "changes", "demo", "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
      }),
    );
    archiveTaiyiChange(taiyiRoot, "demo");
    fs.mkdirSync(path.join(taiyiRoot, "changes", "demo"), { recursive: true });
    fs.writeFileSync(
      path.join(taiyiRoot, "changes", "demo", "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "change",
        completedPhases: [],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "active",
      }),
    );
    const dir = resolveChangeDir(taiyiRoot, "demo");
    expect(dir).toBe(path.join(taiyiRoot, "archive", "demo"));
  });

  it("findExistingArchiveDirForSlug matches dated archive dir names", () => {
    const dated = path.join(taiyiRoot, "archive", "2026-06-09-demo");
    fs.mkdirSync(dated, { recursive: true });
    fs.writeFileSync(
      path.join(dated, "state.json"),
      JSON.stringify({ slug: "demo", completedPhases: ["integration"], workflowStatus: "completed" }),
    );
    expect(findExistingArchiveDirForSlug(taiyiRoot, "demo")).toBe(dated);
    expect(isTaiyiArchived(taiyiRoot, "demo")).toBe(true);
  });

  it("second taiyiArchive prints idempotent no-op for dated archive dir", () => {
    const dated = path.join(taiyiRoot, "archive", "2026-06-09-demo");
    fs.mkdirSync(dated, { recursive: true });
    fs.writeFileSync(
      path.join(dated, "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      }),
    );
    fs.rmSync(path.join(taiyiRoot, "changes", "demo"), { recursive: true, force: true });
    const r = taiyiArchive(tmp, "demo", { skipSpecs: true });
    expect(r.ok).toBe(true);
    expect(r.alreadyArchived).toBe(true);
    const text = formatArchivePlain("demo", r);
    expect(text).toMatch(/已归档.*幂等|幂等 no-op/i);
  });

  it("second taiyiArchive prints idempotent no-op", () => {
    fs.writeFileSync(
      path.join(taiyiRoot, "changes", "demo", "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      }),
    );
    archiveTaiyiChange(taiyiRoot, "demo");
    const r = taiyiArchive(tmp, "demo", { skipSpecs: true });
    expect(r.ok).toBe(true);
    const text = formatArchivePlain("demo", r);
    expect(text).toMatch(/幂等|no-op|already|跳过重复/i);
  });

  it("falls back to taiyi-only archive when openspec CLI fails after integration", () => {
    fs.writeFileSync(
      path.join(taiyiRoot, "changes", "demo", "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      }),
    );
    fs.mkdirSync(path.join(tmp, "openspec", "changes", "demo"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "openspec", "config.yaml"), "schema: spec-driven\n");

    const spy = vi.spyOn(openspec, "runOpenspecArchive").mockReturnValue({
      ok: false,
      reason: "openspec validation failed (probe mock)",
    });

    const r = taiyiArchive(tmp, "demo");
    spy.mockRestore();

    expect(r.ok).toBe(true);
    expect(isTaiyiArchived(taiyiRoot, "demo")).toBe(true);
    const text = formatArchivePlain("demo", r);
    expect(text).toMatch(/Taiyi 归档|已归档/i);
  });
});
