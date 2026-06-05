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

  it("rejects complete on human phase without approver", () => {
    const init = taiyiInit(workspace, "feat-b", "Feature B");
    expect(init.ok).toBe(true);
    const changeDir = path.join(workspace, ".taiyi", "changes", "feat-b");
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# CHANGE: Feature B\n\n## Motivation\nNeed B.\n\n## Scope\n- In: core\n\n## Success Criteria\n- [ ] ok\n`,
    );
    const blocked = taiyiComplete(workspace, "feat-b", "change");
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toMatch(/approver/);
  });

  it("init seeds templates and complete change phase in project workspace", () => {
    const init = taiyiInit(workspace, "feat-a", "Feature A");
    expect(init.ok).toBe(true);
    expect(init.seeded.length).toBeGreaterThan(0);
    const changeDir = path.join(workspace, ".taiyi", "changes", "feat-a");
    fs.writeFileSync(
      path.join(changeDir, "CHANGE.md"),
      `# CHANGE: Feature A

## Motivation
Need feature A for users.

## Scope
- In: core flow

## Success Criteria
- [ ] Users can use feature A
`,
    );
    const done = taiyiComplete(workspace, "feat-a", "change", {
      human: { approved: true, approver: "reviewer@example.com" },
    });
    expect(done.ok).toBe(true);
    const status = taiyiStatus(workspace, "feat-a");
    expect(status.ok && status.state?.currentPhase).toBe("requirement");
  });
});
