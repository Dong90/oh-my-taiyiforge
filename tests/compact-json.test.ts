import { describe, expect, it } from "vitest";
import { buildDoctorJsonCompact, runDoctor } from "../src/core/doctor.js";
import {
  auditWorkspace,
  buildAuditJsonCompact,
} from "../src/core/workflow-audit.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("compact json", () => {
  it("buildDoctorJsonCompact omits passing checks", () => {
    const pkgRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const report = runDoctor(pkgRoot);
    const compact = buildDoctorJsonCompact({ ok: report.ok, report });
    expect(compact.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(compact.installOk).toBe(report.ok);
    expect(compact.failed.every((f) => f.id && f.detail)).toBe(true);
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify({ ok: true, report }).length);
  });

  it("buildAuditJsonCompact keeps high findings only", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-audit-compact-"));
    const taiyiRoot = path.join(workspace, ".taiyi");
    const changeDir = path.join(taiyiRoot, "changes", "demo");
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "complete",
        completedPhases: [],
        profile: "lite",
        skippedPhases: ["ui-design", "task", "ui-design"],
        strictDev: false,
        auxiliaryCompleted: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-06-05T00:00:00Z",
      }),
    );
    const report = auditWorkspace(workspace, taiyiRoot, { slug: "demo" });
    const compact = buildAuditJsonCompact(report);
    expect(compact.highCount).toBeGreaterThan(0);
    expect(compact.findings.every((f) => f.severity === "high")).toBe(true);
    expect(compact.findings.some((f) => f.code === "state.legacy-phase")).toBe(true);
    fs.rmSync(workspace, { recursive: true, force: true });
  });
});
