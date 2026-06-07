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

  it("returns review-phase superpowers and gstack hooks", () => {
    const ctx = getHarnessContext(tmp, "feat", "review");
    expect(
      ctx.hooks.some((h) => h.tool === "superpowers" && h.skill === "requesting-code-review"),
    ).toBe(true);
    expect(ctx.hooks.some((h) => h.tool === "gstack" && h.skill === "review")).toBe(true);
  });

  it("returns change-phase superpowers brainstorming hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "change");
    expect(ctx.hooks.some((h) => h.tool === "superpowers" && h.skill === "brainstorming")).toBe(true);
  });

  it("returns integration-phase finishing-a-development-branch hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "integration");
    expect(
      ctx.hooks.some((h) => h.tool === "superpowers" && h.skill === "finishing-a-development-branch"),
    ).toBe(true);
    expect(
      ctx.hooks.some((h) => h.tool === "superpowers" && h.skill === "verification-before-completion"),
    ).toBe(true);
  });

  it("returns test-phase gstack qa hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "test");
    expect(ctx.hooks.some((h) => h.tool === "gstack" && h.skill === "qa")).toBe(true);
    expect(ctx.hooks.some((h) => h.tool === "superpowers" && h.skill === "verification-before-completion")).toBe(
      true,
    );
    expect(ctx.hooks.find((h) => h.skill === "qa")?.optional).toBe(true);
  });

  it("returns task-phase superpowers TDD hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "task");
    expect(
      ctx.hooks.some((h) => h.tool === "superpowers" && h.skill === "test-driven-development"),
    ).toBe(true);
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

  it("returns test-phase playwright and review-phase semgrep hooks", () => {
    const testCtx = getHarnessContext(tmp, "feat", "test");
    expect(testCtx.hooks.some((h) => h.tool === "playwright")).toBe(true);
    const reviewCtx = getHarnessContext(tmp, "feat", "review");
    expect(reviewCtx.hooks.some((h) => h.tool === "semgrep")).toBe(true);
    expect(reviewCtx.hooks.some((h) => h.tool === "trivy")).toBe(true);
  });

  it("returns ui-design web-design-guidelines hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "ui-design");
    expect(
      ctx.hooks.some((h) => h.tool === "web-quality" && h.skill === "web-design-guidelines"),
    ).toBe(true);
  });
});
