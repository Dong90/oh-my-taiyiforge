import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { listChanges } from "../src/core/list-changes.js";

function writeState(
  dir: string,
  slug: string,
  workflowStatus: string,
  completed: string[] = [],
  profile = "full",
) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "state.json"),
    JSON.stringify({
      slug,
      currentPhase: "integration",
      completedPhases: completed,
      profile,
      skippedPhases: profile === "lite" ? ["design", "ui-design", "task", "review"] : [],
      workflowStatus,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    }),
  );
}

describe("list-changes", () => {
  let taiyiRoot: string;

  beforeEach(() => {
    taiyiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-list-"));
  });

  afterEach(() => {
    fs.rmSync(taiyiRoot, { recursive: true, force: true });
  });

  it("default lists only workflowActive changes", () => {
    writeState(path.join(taiyiRoot, "changes", "active"), "active", "active");
    writeState(path.join(taiyiRoot, "changes", "done"), "done", "completed", [
      "change",
      "requirement",
      "dev",
      "test",
      "integration",
    ], "lite");
    writeState(path.join(taiyiRoot, "changes", "aborted"), "aborted", "aborted");
    const list = listChanges(taiyiRoot);
    expect(list.map((c) => c.slug)).toEqual(["active"]);
  });

  it("--all includes completed and aborted", () => {
    writeState(path.join(taiyiRoot, "changes", "active"), "active", "active");
    writeState(path.join(taiyiRoot, "changes", "done"), "done", "completed", [
      "change",
      "requirement",
      "dev",
      "test",
      "integration",
    ], "lite");
    const list = listChanges(taiyiRoot, { includeAll: true });
    expect(list.map((c) => c.slug).sort()).toEqual(["active", "done"]);
  });

  it("--archived lists only archive dir", () => {
    writeState(path.join(taiyiRoot, "changes", "active"), "active", "active");
    writeState(path.join(taiyiRoot, "archive", "old"), "old", "completed", [
      "change",
      "requirement",
      "dev",
      "test",
      "integration",
    ], "lite");
    const list = listChanges(taiyiRoot, { includeArchived: true });
    expect(list.map((c) => c.slug)).toEqual(["old"]);
    expect(list.every((c) => c.archived)).toBe(true);
  });

  it("--all --archived merges changes and archive", () => {
    writeState(path.join(taiyiRoot, "changes", "active"), "active", "active");
    writeState(path.join(taiyiRoot, "archive", "old"), "old", "completed", [
      "change",
      "requirement",
      "dev",
      "test",
      "integration",
    ], "lite");
    const list = listChanges(taiyiRoot, { includeAll: true, includeArchived: true });
    expect(list.map((c) => c.slug).sort()).toEqual(["active", "old"]);
  });
});
