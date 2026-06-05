import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  taiyiInit,
  taiyiComplete,
  taiyiPhases,
  taiyiStatus,
} from "../src/plugin/handlers.js";

describe("plugin-handlers", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-ws-"));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("lists nine phases with taiyi- skill prefix", () => {
    const phases = taiyiPhases();
    expect(phases).toHaveLength(9);
    expect(phases.every((p) => p.skill.startsWith("taiyi-"))).toBe(true);
  });

  it("init and complete change phase in project workspace", () => {
    const init = taiyiInit(workspace, "feat-a");
    expect(init.ok).toBe(true);
    const changeDir = path.join(workspace, ".taiyi", "changes", "feat-a");
    fs.writeFileSync(path.join(changeDir, "CHANGE.md"), "# Change\n\n## Motivation\nx");
    const done = taiyiComplete(workspace, "feat-a", "change");
    expect(done.ok).toBe(true);
    const status = taiyiStatus(workspace, "feat-a");
    expect(status.ok && status.state?.currentPhase).toBe("requirement");
  });
});
