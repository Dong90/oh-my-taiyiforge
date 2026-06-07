import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { resetChangeArtifacts } from "../src/core/change-artifact-reset.js";

describe("change-artifact-reset", () => {
  let changeDir: string;

  beforeEach(() => {
    changeDir = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-reset-"));
  });

  afterEach(() => {
    fs.rmSync(changeDir, { recursive: true, force: true });
  });

  it("removes phase artifacts, auxiliary files, and runtime state", () => {
    fs.writeFileSync(path.join(changeDir, "REQUIREMENT.md"), "# REQ\n\ncontent\n", "utf8");
    fs.writeFileSync(path.join(changeDir, "CONTEXT.md"), "# CONTEXT\n\nscan\n", "utf8");
    fs.writeFileSync(path.join(changeDir, "health-report.md"), "# Health\n\nok\n", "utf8");
    fs.mkdirSync(path.join(changeDir, "adr"), { recursive: true });
    fs.writeFileSync(path.join(changeDir, "adr", "001.md"), "# ADR\n\nlong enough body for adr gate\n", "utf8");
    fs.writeFileSync(path.join(changeDir, ".harness-checkpoints.json"), "{}", "utf8");
    fs.writeFileSync(path.join(changeDir, "state.json"), '{"slug":"x"}', "utf8");

    const removed = resetChangeArtifacts(changeDir);

    expect(fs.existsSync(path.join(changeDir, "REQUIREMENT.md"))).toBe(false);
    expect(fs.existsSync(path.join(changeDir, "CONTEXT.md"))).toBe(false);
    expect(fs.existsSync(path.join(changeDir, "health-report.md"))).toBe(false);
    expect(fs.existsSync(path.join(changeDir, "adr"))).toBe(false);
    expect(fs.existsSync(path.join(changeDir, ".harness-checkpoints.json"))).toBe(false);
    expect(fs.existsSync(path.join(changeDir, "state.json"))).toBe(true);
    expect(removed.length).toBeGreaterThan(0);
  });
});
