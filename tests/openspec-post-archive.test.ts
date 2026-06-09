import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  findOpenspecArchivedChange,
  getOpenspecStatus,
  runOpenspecArchive,
} from "../src/integrations/openspec.js";
import { syncTaiyiToOpenspec } from "../src/integrations/openspec-sync.js";
import { auditChange } from "../src/core/workflow-audit.js";

describe("openspec post-archive", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-os-arch-"));
    fs.mkdirSync(path.join(tmp, "openspec", "changes", "archive", "2026-06-09-demo-slug"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(tmp, "openspec", "config.yaml"), "change_root: openspec/changes\n");
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("findOpenspecArchivedChange resolves archive path", () => {
    const p = findOpenspecArchivedChange(tmp, "demo-slug");
    expect(p).toContain("archive");
    expect(p).toContain("demo-slug");
  });

  it("getOpenspecStatus sets archivedExists when only archive present", () => {
    const s = getOpenspecStatus(tmp, "demo-slug");
    expect(s.changeExists).toBe(false);
    expect(s.archivedExists).toBe(true);
    expect(s.archivedPath).toBeTruthy();
  });

  it("runOpenspecArchive is idempotent when already archived", () => {
    const r = runOpenspecArchive(tmp, "demo-slug");
    expect(r.ok).toBe(true);
    expect(r.alreadyArchived).toBe(true);
  });

  it("syncTaiyiToOpenspec refuses post-archive without force", () => {
    const taiyiDir = path.join(tmp, ".taiyi", "changes", "demo-slug");
    fs.mkdirSync(taiyiDir, { recursive: true });
    fs.writeFileSync(path.join(taiyiDir, "CHANGE.md"), "# CHANGE\n");
    const r = syncTaiyiToOpenspec(tmp, "demo-slug", taiyiDir);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/已归档/);
  });

  it("audit skips missing-active-change when openspec archived", () => {
    const taiyiRoot = path.join(tmp, ".taiyi");
    const changeDir = path.join(taiyiRoot, "changes", "demo-slug");
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, "state.json"),
      JSON.stringify({
        slug: "demo-slug",
        currentPhase: "integration",
        completedPhases: ["integration"],
        profile: "lite",
        skippedPhases: [],
        workflowStatus: "completed",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      }),
    );
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "# CHANGE\n\n## Success Criteria\n- [x] ok\n");

    const audit = auditChange(tmp, taiyiRoot, "demo-slug");
    const codes = audit?.findings.map((f) => f.code) ?? [];
    expect(codes).not.toContain("openspec.missing-active-change");
  });
});
