import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runDoctorWorkspace } from "../src/core/doctor-workspace.js";
import { taiyiDoctor } from "../src/plugin/handlers.js";
import { resolvePackageRoot } from "../src/core/package-root.js";

describe("doctor-workspace", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-doc-ws-"));
    taiyiRoot = path.join(workspace, ".taiyi");
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("reports no changes dir", () => {
    const checks = runDoctorWorkspace(workspace, taiyiRoot, import.meta.url);
    expect(checks.some((c) => c.id === "workflow-changes-dir")).toBe(true);
  });

  it("flags multiple active changes", () => {
    for (const slug of ["a", "b"]) {
      const dir = path.join(taiyiRoot, "changes", slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "state.json"),
        JSON.stringify({
          slug,
          currentPhase: "change",
          completedPhases: [],
          profile: "full",
          workflowStatus: "active",
          updatedAt: new Date().toISOString(),
        }),
      );
    }
    const checks = runDoctorWorkspace(workspace, taiyiRoot, import.meta.url);
    const active = checks.find((c) => c.id === "workflow-active-count");
    expect(active?.ok).toBe(false);
  });

  it("strict-workspace fails doctor when multiple active", { timeout: 20_000 }, () => {
    for (const slug of ["a", "b"]) {
      const dir = path.join(taiyiRoot, "changes", slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "state.json"),
        JSON.stringify({
          slug,
          currentPhase: "change",
          completedPhases: [],
          profile: "full",
          workflowStatus: "active",
          updatedAt: new Date().toISOString(),
        }),
      );
    }
    const pkgRoot = resolvePackageRoot(new URL("../src/plugin/handlers.ts", import.meta.url).href);
    const soft = taiyiDoctor(pkgRoot, workspace);
    const strict = taiyiDoctor(pkgRoot, workspace, { strictWorkspace: true });
    expect(soft.ok).toBe(true);
    expect(soft.report.workspaceOk).toBe(false);
    expect(strict.ok).toBe(false);
  });
});
