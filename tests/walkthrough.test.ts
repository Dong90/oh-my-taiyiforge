import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runWalkthrough, formatWalkthroughPlain } from "../src/core/walkthrough.js";

describe("walkthrough", () => {
  it("runs doctor + init + next in a temp workspace", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-wt-"));
    const r = runWalkthrough(workspace, { slug: "wt-test", profile: "api" });
    expect(r.ok).toBe(true);
    expect(r.steps.find((s) => s.label === "doctor")?.ok).toBe(true);
    expect(r.steps.find((s) => s.label === "init")?.ok).toBe(true);
    expect(r.nextText).toContain("wt-test");
    expect(fs.existsSync(path.join(workspace, ".taiyi/changes/wt-test/CHANGE.md"))).toBe(true);

    const text = formatWalkthroughPlain(r);
    expect(text).toContain("TaiyiForge");
    expect(text).toContain("npx taiyi next");
  });

  it("reuses existing slug on second run", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-wt2-"));
    const first = runWalkthrough(workspace, { slug: "reuse" });
    expect(first.ok).toBe(true);
    const second = runWalkthrough(workspace, { slug: "reuse" });
    expect(second.ok).toBe(true);
    expect(second.steps.find((s) => s.label === "init")?.detail).toContain("已存在");
  });
});
