import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runForge, copyFullFlowDemoFixture } from "../src/core/run-slash-flow-cli.js";
import { handoffExists } from "../src/core/handoff.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("handoff CLI 链", () => {
  let workspace: string;
  const slug = "handoff-cli-demo";

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-handoff-cli-"));
    copyFullFlowDemoFixture(REPO, workspace);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("init → handoff 写 HANDOFF.md → status 仍为进行中", () => {
    const init = runForge(REPO, workspace, [
      "init",
      slug,
      "--title",
      "Handoff CLI smoke",
    ]);
    expect(init.code).toBe(0);

    const changeDir = path.join(workspace, ".taiyi/changes", slug);
    expect(handoffExists(changeDir)).toBe(false);

    const handoff = runForge(REPO, workspace, [
      "handoff",
      slug,
      "paused before requirement",
    ]);
    expect(handoff.code).toBe(0);
    expect(handoffExists(changeDir)).toBe(true);
    expect(fs.readFileSync(path.join(changeDir, "HANDOFF.md"), "utf8")).toContain(
      "paused before requirement",
    );

    const status = runForge(REPO, workspace, ["status", slug]);
    expect(status.code).toBe(0);
    expect(status.out).toMatch(/change|1\/9/i);

    const state = JSON.parse(fs.readFileSync(path.join(changeDir, "state.json"), "utf8"));
    expect(state.workflowStatus).toBe("active");
    expect(state.currentPhase).toBe("change");
  }, 60_000);

  it("pause 别名等价 handoff", () => {
    runForge(REPO, workspace, ["init", slug, "--title", "Pause alias"]);
    const pause = runForge(REPO, workspace, ["pause", slug, "via pause"]);
    expect(pause.code).toBe(0);
    expect(
      fs.readFileSync(path.join(workspace, ".taiyi/changes", slug, "HANDOFF.md"), "utf8"),
    ).toContain("via pause");
  }, 60_000);
});
