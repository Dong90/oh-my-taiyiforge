import { describe, expect, it } from "vitest";
import { parseRepeatCount, defaultLoopMax } from "../src/core/repeat-parse.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { resolveTemplatesDir } from "../src/core/package-root.js";
import { runContinueRepeat, runLoopUntilComplete } from "../src/core/loop-runner.js";
import { readLoopState, clearLoopState } from "../src/core/loop-state.js";
import { E2E_ARTIFACTS } from "../src/core/e2e-fixtures.js";

describe("repeat-parse", () => {
  it("parses x5 suffix", () => {
    expect(parseRepeatCount(["my-slug", "x5"]).times).toBe(5);
    expect(parseRepeatCount(["my-slug", "x5"]).positional).toEqual(["my-slug"]);
  });

  it("parses --times", () => {
    expect(parseRepeatCount(["--times", "3"]).times).toBe(3);
  });

  it("default loop max is positive", () => {
    expect(defaultLoopMax()).toBeGreaterThan(0);
  });
});

describe("loop-runner", () => {
  const templatesDir = resolveTemplatesDir(import.meta.url);

  it("continues through ready phases in one loop", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-loop-"));
    const taiyiRoot = path.join(tmp, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
    const engine = new WorkflowEngine(taiyiRoot, templatesDir);
    engine.initChange("loop-demo", { title: "Loop", autoHarness: false, templatesDir });

    const changeDir = engine.changeDir("loop-demo");
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      E2E_ARTIFACTS.change.replace(/E2E Demo/g, "Loop"),
      "utf8",
    );

    const r = runContinueRepeat(engine, tmp, taiyiRoot, "loop-demo", 3);
    expect(r.attempts.length).toBeGreaterThanOrEqual(1);
    expect(r.attempts[0]?.outcome).toBe("blocked");
    expect(r.attempts[0]?.phase).toBe("change");

    clearLoopState(changeDir);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("loop until complete records state on block", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-loop2-"));
    const taiyiRoot = path.join(tmp, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
    const engine = new WorkflowEngine(taiyiRoot, templatesDir);
    engine.initChange("block-demo", { title: "Block", autoHarness: true, templatesDir });

    const r = runLoopUntilComplete(engine, tmp, taiyiRoot, "block-demo", 2);
    expect(r.ok).toBe(false);
    expect(r.stopReason).toMatch(/blocked|max/);
    const st = readLoopState(engine.changeDir("block-demo"));
    expect(st?.round).toBe(1);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
