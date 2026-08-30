import { describe, expect, it, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TaiyiAPI } from "../src/core/taiyi-api.js";

let workspace: string;

afterEach(() => {
  if (workspace) fs.rmSync(workspace, { recursive: true, force: true });
});

describe("TaiyiAPI", () => {
  it("roots engine operations under the workspace .taiyi directory", () => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-api-"));
    const api = new TaiyiAPI(workspace);

    expect(api.taiyiRoot).toBe(path.join(workspace, ".taiyi"));
    api.init({ slug: "api-root", title: "API root" });

    expect(fs.existsSync(path.join(workspace, ".taiyi", "changes", "api-root", "state.json"))).toBe(true);
    expect(fs.existsSync(path.join(workspace, "changes", "api-root"))).toBe(false);
  });

  it("creates a stable fallback slug for non-ASCII titles", () => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-api-"));
    const api = new TaiyiAPI(workspace);

    const state = api.init({ title: "添加登录功能" });

    expect(state.slug).toMatch(/^ty-[a-z0-9]+$/);
  });
});
