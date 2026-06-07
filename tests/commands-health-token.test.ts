import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { resolveTemplatesDir } from "../src/core/package-root.js";
import { taiyiHealth, taiyiToken } from "../src/plugin/handlers.js";
describe("command handlers — health & token", () => {
  let workspace: string;
  let taiyiRoot: string;
  const templatesDir = resolveTemplatesDir(import.meta.url);

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-cmd-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    fs.mkdirSync(path.join(taiyiRoot, "changes"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("health infers the single active change when completed changes also exist", () => {
    const engine = new WorkflowEngine(taiyiRoot, templatesDir);
    engine.initChange("done-old", { title: "Done", templatesDir });
    const doneDir = engine.changeDir("done-old");
    const doneState = engine.getState("done-old")!;
    const completedPhases = [
      "change",
      "requirement",
      "design",
      "ui-design",
      "task",
      "dev",
      "test",
      "review",
      "integration",
    ];
    fs.writeFileSync(
      path.join(doneDir, "state.json"),
      JSON.stringify(
        {
          ...doneState,
          currentPhase: "integration",
          completedPhases,
          workflowStatus: "completed",
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );

    engine.initChange("active-one", { title: "Active", templatesDir });

    const r = taiyiHealth(workspace);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.slug).toBe("active-one");
  });

  it("token record accepts tokens-only when one active change exists", () => {
    const engine = new WorkflowEngine(taiyiRoot, templatesDir);
    engine.initChange("tok-demo", { title: "Tok", templatesDir });

    const r = taiyiToken(workspace, "record", { tokens: 1200 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toMatch(/1200|1,200/);
  });
});
