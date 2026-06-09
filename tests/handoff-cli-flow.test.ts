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

  it("handoff on completed change exits 0 (noop)", () => {
    runForge(REPO, workspace, ["init", slug, "--profile", "lite", "--title", "Done handoff"]);
    const changeDir = path.join(workspace, ".taiyi/changes", slug);
    const statePath = path.join(changeDir, "state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.currentPhase = "integration";
    state.completedPhases = ["change", "requirement", "dev", "test", "integration"];
    state.workflowStatus = "completed";
    fs.writeFileSync(statePath, JSON.stringify(state));
    const handoff = runForge(REPO, workspace, ["handoff", slug]);
    expect(handoff.code).toBe(0);
    expect(handoff.out).toMatch(/无需 handoff/);
  }, 60_000);

  it("handoff on archived-only change exits 0 (noop)", () => {
    const archiveDir = path.join(workspace, ".taiyi/archive", slug);
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.writeFileSync(
      path.join(archiveDir, "state.json"),
      JSON.stringify({
        slug,
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
    const handoff = runForge(REPO, workspace, ["handoff", slug]);
    expect(handoff.code).toBe(0);
    expect(handoff.out).toMatch(/无需 handoff|已归档/);
  }, 60_000);

  it("handoff on dated archive dir only exits 0 (noop)", () => {
    const dated = path.join(workspace, ".taiyi/archive", `2026-06-09-${slug}`);
    fs.mkdirSync(dated, { recursive: true });
    fs.writeFileSync(
      path.join(dated, "state.json"),
      JSON.stringify({
        slug,
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
    const handoff = runForge(REPO, workspace, ["handoff", slug]);
    expect(handoff.code).toBe(0);
    expect(handoff.out).toMatch(/无需 handoff|已归档/);
  }, 60_000);
});
