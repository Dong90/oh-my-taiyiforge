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

  it("returns review-phase ecc code-review and ecc security-scan (no gstack)", () => {
    const ctx = getHarnessContext(tmp, "feat", "review");
    expect(
      ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "code-review"),
    ).toBe(true);
    expect(ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "security-scan")).toBe(true);
    expect(ctx.hooks.some((h) => h.tool === "gstack" && h.skill === "review")).toBe(false);
  });

  it("returns change-phase superpowers brainstorming hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "change");
    expect(ctx.hooks.some((h) => h.tool === "superpowers" && h.skill === "brainstorming")).toBe(true);
  });

  it("returns integration-phase ecc delivery-gate and verification-loop hooks", () => {
    const ctx = getHarnessContext(tmp, "feat", "integration");
    expect(
      ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "delivery-gate"),
    ).toBe(true);
    expect(
      ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "verification-loop"),
    ).toBe(true);
  });

  it("returns test-phase playwright and ecc coverage hooks (no gstack qa cap)", () => {
    const ctx = getHarnessContext(tmp, "feat", "test");
    expect(ctx.hooks.some((h) => h.tool === "playwright")).toBe(true);
    expect(ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "test-coverage-analysis")).toBe(
      true,
    );
    expect(ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "verification-loop")).toBe(
      true,
    );
    expect(ctx.hooks.some((h) => h.tool === "gstack" && h.skill === "qa")).toBe(false);
  });

  it("returns task-phase ecc tdd-workflow hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "task");
    expect(
      ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "tdd-workflow"),
    ).toBe(true);
  });

  it("returns design-phase mandatory ecc architecture hooks", () => {
    const ctx = getHarnessContext(tmp, "feat", "design");
    const audit = ctx.hooks.find((h) => h.tool === "ecc" && h.skill === "architecture-audit");
    expect(audit).toBeDefined();
    expect(audit?.optional).not.toBe(true);
  });

  it("returns review-phase mandatory ecc security-scan hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "review");
    const scan = ctx.hooks.find((h) => h.tool === "ecc" && h.skill === "security-scan");
    expect(scan).toBeDefined();
    expect(scan?.optional).not.toBe(true);
  });

  it("returns ui-design ecc hooks only (no gstack/web-quality cap)", () => {
    const ctx = getHarnessContext(tmp, "feat", "ui-design");
    expect(ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "web-design-guidelines")).toBe(
      true,
    );
    expect(ctx.hooks.some((h) => h.tool === "gstack" && h.skill === "plan-design-review")).toBe(
      false,
    );
  });

  it("notes missing openspec change on integration", () => {
    fs.mkdirSync(path.join(tmp, "openspec"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "openspec", "config.yaml"), "x: 1\n");
    const ctx = getHarnessContext(tmp, "no-dir", "integration");
    expect(ctx.notes.some((n) => n.includes("openspec/changes"))).toBe(true);
  });

  it("returns test-phase playwright hook", () => {
    const testCtx = getHarnessContext(tmp, "feat", "test");
    expect(testCtx.hooks.some((h) => h.tool === "playwright")).toBe(true);
  });

  it("returns ui-design ecc web-design-guidelines hook", () => {
    const ctx = getHarnessContext(tmp, "feat", "ui-design");
    expect(
      ctx.hooks.some((h) => h.tool === "ecc" && h.skill === "web-design-guidelines"),
    ).toBe(true);
  });

  it("integration phase includes openspec archive hook from workflow manifest", () => {
    const ctx = getHarnessContext(tmp, "feat", "integration");
    const hook = ctx.hooks.find((h) => h.tool === "openspec" && h.command?.includes("archive"));
    expect(hook).toBeDefined();
    expect(hook?.command).toContain("taiyi archive feat");
  });

  it("test phase includes playwright e2e hook from provider defaults", () => {
    const ctx = getHarnessContext(tmp, "feat", "test");
    const hook = ctx.hooks.find((h) => h.tool === "playwright");
    expect(hook).toBeDefined();
    expect(hook?.command).toContain("npx playwright test");
  });

  it("review phase has no semgrep/trivy capability hooks after dedup", () => {
    const ctx = getHarnessContext(tmp, "feat", "review");
    expect(ctx.hooks.some((h) => h.tool === "semgrep")).toBe(false);
    expect(ctx.hooks.some((h) => h.tool === "trivy")).toBe(false);
  });

  it("providers.yaml adds builtin provider notes for integration phase", () => {
    const taiyiDir = path.join(tmp, ".taiyi");
    fs.mkdirSync(taiyiDir, { recursive: true });
    fs.writeFileSync(
      path.join(taiyiDir, "providers.yaml"),
      [
        "version: 1",
        "assignments:",
        "  spec_archive: taiyi-builtin",
        "  spec_sync: taiyi-builtin",
      ].join("\n") + "\n",
    );

    const ctx = getHarnessContext(tmp, "feat", "integration");
    expect(ctx.notes.some((n) => n.includes("taiyi-builtin") && n.includes("spec_archive"))).toBe(true);
  });

  it("providers.yaml adds CLI hook for custom provider on test phase", () => {
    const taiyiDir = path.join(tmp, ".taiyi");
    fs.mkdirSync(taiyiDir, { recursive: true });
    fs.writeFileSync(
      path.join(taiyiDir, "providers.yaml"),
      [
        "version: 1",
        "providers:",
        "  custom-e2e:",
        "    type: cli",
        "    cli: custom-e2e --dir $WORKSPACE",
        "    detect: which custom-e2e",
        "    provides: [e2e_test]",
        "assignments:",
        "  e2e_test: custom-e2e",
      ].join("\n") + "\n",
    );

    const ctx = getHarnessContext(tmp, "feat", "test");
    const hook = ctx.hooks.find((h) => h.tool === "custom-e2e");
    expect(hook).toBeDefined();
    expect(hook?.command).toBe("custom-e2e --dir " + tmp);
  });
});
