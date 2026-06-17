import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { verifyWorkspaceCi } from "../src/core/ci-verify.js";
import { probePlatformCi } from "../src/core/ci-platform.js";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { E2E_ARTIFACTS } from "../src/core/e2e-fixtures.js";

describe("ci verify", () => {
  let workspace: string;
  let root: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-civ-"));
    root = path.join(workspace, ".taiyi");
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("passes when no changes dir", () => {
    const r = verifyWorkspaceCi(workspace, root);
    expect(r.ok).toBe(true);
    expect(r.changeCount).toBe(0);
  });

  it("reports blockers for incomplete change", () => {
    const engine = new WorkflowEngine(root);
    engine.initChange("ci-demo", { autoHarness: true });
    fs.writeFileSync(
      path.join(engine.changeDir("ci-demo"), "CHANGE.md"),
      E2E_ARTIFACTS.change.md,
      "utf8",
    );
    const r = verifyWorkspaceCi(workspace, root);
    expect(r.changeCount).toBe(1);
    expect(r.changes[0].slug).toBe("ci-demo");
    expect(r.changes[0].blockers.length).toBeGreaterThan(0);
    expect(r.ok).toBe(false);
  });
});

describe("ci platform", () => {
  it("smoke installs 17 skills for each platform", () => {
    const pkgRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    for (const p of ["opencode", "claude", "codex", "cursor"] as const) {
      const probe = probePlatformCi(pkgRoot, p);
      expect(probe.skillsInstalled).toBeGreaterThanOrEqual(17);
      expect(probe.ok).toBe(true);
    }
  });
});
