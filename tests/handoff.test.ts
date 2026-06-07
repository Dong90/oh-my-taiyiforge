import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeHandoff, handoffExists, buildHandoffMarkdown } from "../src/core/handoff.js";
import type { ChangeState } from "../src/core/types.js";

function baseState(overrides: Partial<ChangeState> = {}): ChangeState {
  return {
    slug: "demo",
    currentPhase: "design",
    completedPhases: ["change", "requirement"],
    profile: "full",
    skippedPhases: [],
    strictDev: false,
    autoHarness: false,
    auxiliaryCompleted: [],
    workflowStatus: "active",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("handoff", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-handoff-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes HANDOFF.md", () => {
    const state = baseState();
    const { path: filePath, content } = writeHandoff({
      changeDir: dir,
      state,
      note: "blocked on API shape",
      statusLine: "当前: design（3/9）",
    });
    expect(filePath).toContain("HANDOFF.md");
    expect(handoffExists(dir)).toBe(true);
    expect(content).toContain("blocked on API shape");
    expect(content).toContain("design");
  });

  it("buildHandoffMarkdown includes completed phases", () => {
    const md = buildHandoffMarkdown({ changeDir: dir, state: baseState() });
    expect(md).toContain("- change");
    expect(md).toContain("- requirement");
  });

  it("includes compress hint when provided", () => {
    const md = buildHandoffMarkdown({
      changeDir: dir,
      state: baseState(),
      compressHint: "run /taiyi:token compress",
    });
    expect(md).toContain("Token / 上下文");
    expect(md).toContain("compress");
  });
});
