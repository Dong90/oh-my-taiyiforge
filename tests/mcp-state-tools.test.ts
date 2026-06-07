import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { WorkflowEngine } from "../src/core/workflow-engine.js";
import { resolveTemplatesDir } from "../src/core/package-root.js";
import {
  taiyiStateGetStatus,
  taiyiStateHandoff,
  taiyiStateCancel,
  taiyiStateListActive,
  taiyiStateRead,
} from "../src/mcp/state-tools.js";

describe("mcp state-tools", () => {
  let workspace: string;
  let taiyiRoot: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-mcp-"));
    taiyiRoot = path.join(workspace, ".taiyi");
    const engine = new WorkflowEngine(taiyiRoot, resolveTemplatesDir(import.meta.url));
    engine.initChange("demo-change", { title: "Demo", profile: "lite" });
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("list_active returns changes and inferred slug", () => {
    const r = taiyiStateListActive(workspace);
    expect(r.changes.length).toBe(1);
    expect(r.active.length).toBe(1);
    expect(r.inferredSlug).toBe("demo-change");
  });

  it("get_status returns engineTruth", () => {
    const r = taiyiStateGetStatus(workspace, "demo-change");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.slug).toBe("demo-change");
      expect(r.engineTruth).toBeDefined();
      expect(r.statusLine).toMatch(/change|1\//i);
    }
  });

  it("handoff writes HANDOFF.md", () => {
    const r = taiyiStateHandoff(workspace, "demo-change", "resume from MCP");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(fs.existsSync(r.path)).toBe(true);
      expect(fs.readFileSync(r.path, "utf8")).toContain("resume from MCP");
      expect(r.engineTruth.handoffExists).toBe(true);
    }
  });

  it("read returns raw state.json", () => {
    const r = taiyiStateRead(workspace, "demo-change");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.slug).toBe("demo-change");
      expect(r.path).toContain("state.json");
    }
  });

  it("cancel aborts active change", () => {
    const r = taiyiStateCancel(workspace, "demo-change");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.workflowStatus).toBe("aborted");
    }
    const list = taiyiStateListActive(workspace);
    expect(list.active.length).toBe(0);
  });
});
