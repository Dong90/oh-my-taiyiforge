import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ChangeStateSchema } from "../src/schemas/state.js";
import { loadChangeState } from "../src/core/change-status.js";
import { resolveChangeDir } from "../src/core/taiyi-archive.js";

const modernState = {
  slug: "demo",
  currentPhase: "change",
  completedPhases: [],
  profile: "full",
  skippedPhases: [],
  strictDev: false,
  autoHarness: false,
  auxiliaryCompleted: [],
  workflowStatus: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
};

describe("state contract", () => {
  let root: string;
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-state-")); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it("accepts the state shape written by WorkflowEngine", () => {
    expect(ChangeStateSchema.parse(modernState)).toMatchObject(modernState);
  });

  it("loads a legacy state by migrating it to the modern shape", () => {
    const dir = path.join(root, "changes", "demo");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify({
      slug: "demo", active: true, created: "2026-01-01", lastModified: "2026-01-02",
      currentPhase: { current: "change", complete: false, artifacts: ["CHANGE.md"] },
      phases: [],
    }));
    expect(loadChangeState(root, "demo")).toMatchObject({
      slug: "demo", currentPhase: "change", completedPhases: [], workflowStatus: "active",
    });
  });

  it("resolves active and dated archive directories consistently", () => {
    const archive = path.join(root, "archive", "2026-01-02-demo");
    fs.mkdirSync(archive, { recursive: true });
    fs.writeFileSync(path.join(archive, "state.json"), JSON.stringify(modernState));
    expect(resolveChangeDir(root, "demo")).toBe(archive);
    expect(loadChangeState(root, "demo")?.slug).toBe("demo");
  });
});
