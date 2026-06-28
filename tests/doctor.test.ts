import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDoctor } from "../src/core/doctor.js";
import { listChanges } from "../src/core/list-changes.js";
import fs from "node:fs";
import os from "node:os";

describe("doctor", () => {
  it("runs checks against package root", () => {
    const pkgRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const report = runDoctor(pkgRoot);
    expect(report.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
    expect(report.checks.length).toBeGreaterThan(5);
    expect(report.checks.find((c) => c.id === "phase-registry")?.ok).toBe(true);
    expect(report.checks.find((c) => c.id === "templates")?.ok).toBe(true);
  });
});

describe("list-changes", () => {
  it("lists changes from state.json", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-list-"));
    const changeDir = path.join(root, "changes", "demo");
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, "state.json"),
      JSON.stringify({
        slug: "demo",
        currentPhase: "requirement",
        completedPhases: ["change"],
        profile: "api",
        skippedPhases: ["ui-design"],
        strictDev: false,
        auxiliaryCompleted: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-06-05T00:00:00Z",
      }),
    );
    const list = listChanges(root);
    expect(list).toHaveLength(1);
    expect(list[0].slug).toBe("demo");
    expect(list[0].total).toBe(8);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
