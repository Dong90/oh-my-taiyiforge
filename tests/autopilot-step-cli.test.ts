import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFullFlowDemoFixture, runForge } from "../src/core/run-slash-flow-cli.js";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "autopilot-step-demo";

describe("autopilot + step engine CLI", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-autopilot-step-"));
    copyFullFlowDemoFixture(REPO, workspace);
    const init = runForge(REPO, workspace, [
      "init",
      SLUG,
      "--profile",
      "lite",
      "--title",
      "Autopilot step smoke",
    ]);
    expect(init.code, init.out).toBe(0);
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("autopilot command is wired (not unknown)", () => {
    const r = runForge(REPO, workspace, ["autopilot", SLUG]);
    expect(r.code, r.out).not.toBe(2);
    expect(r.out).not.toMatch(/unknown command/i);
    expect(r.out.length).toBeGreaterThan(0);
  });

  it("step command is wired (not unknown)", () => {
    const r = runForge(REPO, workspace, ["step", SLUG]);
    expect(r.code, r.out).not.toBe(2);
    expect(r.out).not.toMatch(/unknown command/i);
    expect(r.out.length).toBeGreaterThan(0);
  });
});
