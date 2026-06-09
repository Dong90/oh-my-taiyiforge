import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { taiyiToken } from "../src/plugin/handlers.js";

describe("token on archived change", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-token-arch-"));
    const taiyiRoot = path.join(workspace, ".taiyi");
    const archiveDir = path.join(taiyiRoot, "archive", "arch-slug");
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(
      path.join(archiveDir, "state.json"),
      JSON.stringify({
        slug: "arch-slug",
        currentPhase: "integration",
        completedPhases: ["change", "requirement", "dev", "test", "integration"],
        profile: "lite",
        skippedPhases: ["design", "ui-design", "task", "review"],
        workflowStatus: "completed",
        autoHarness: false,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      }),
    );
    fs.writeFileSync(
      path.join(archiveDir, "CHANGE.md"),
      "# CHANGE\n\n## Motivation\nfilled content for scan\n\n## Scope\nin\n\n## Success Criteria\n- [x] ok\n",
    );
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("compress rejects archived slug with clear error (no crash)", () => {
    const r = taiyiToken(workspace, "compress", { slug: "arch-slug" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/归档|已完成/);
    }
  });

  it("status works on archived slug", () => {
    const r = taiyiToken(workspace, "status", { slug: "arch-slug" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toMatch(/Token|arch-slug/i);
  });
});
