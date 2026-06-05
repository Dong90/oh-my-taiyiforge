import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getHarnessContext } from "../src/integrations/harness-hooks.js";

describe("harness-hooks", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-hooks-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns review-phase gstack hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "review");
    expect(ctx.hooks.some((h) => h.tool === "gstack" && h.skill === "review")).toBe(true);
  });

  it("returns test-phase gstack qa hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "test");
    expect(ctx.hooks.some((h) => h.tool === "gstack" && h.skill === "qa")).toBe(true);
    expect(ctx.hooks.some((h) => h.tool === "superpowers" && h.skill === "verification-before-completion")).toBe(
      true,
    );
    expect(ctx.hooks.find((h) => h.skill === "qa")?.optional).toBe(true);
  });

  it("returns ui-design optional plan-design-review hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "ui-design");
    const hook = ctx.hooks.find((h) => h.tool === "gstack" && h.skill === "plan-design-review");
    expect(hook).toBeDefined();
    expect(hook?.optional).toBe(true);
  });

  it("notes missing openspec change on integration", () => {
    fs.mkdirSync(path.join(tmp, "openspec"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "openspec", "config.yaml"), "x: 1\n");
    const ctx = getHarnessContext(tmp, "no-dir", "integration");
    expect(ctx.notes.some((n) => n.includes("openspec/changes"))).toBe(true);
  });
});
