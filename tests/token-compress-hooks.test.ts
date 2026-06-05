import { describe, expect, it } from "vitest";
import {
  formatCompressHooksPlain,
  getTokenCompressHooks,
  resolveStrategiesForPhase,
  tokenCompressHarnessHooks,
} from "../src/integrations/token-compress-hooks.js";
import { getHarnessContext } from "../src/integrations/harness-hooks.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("token-compress-hooks", () => {
  it("loads engine and third-party strategies", () => {
    const cfg = getTokenCompressHooks();
    expect(cfg.engine.command).toContain("token compress");
    expect(cfg.thirdParty.some((s) => s.tool === "superpowers" && s.skill === "subagent-driven-development")).toBe(
      true,
    );
    expect(cfg.thirdParty.some((s) => s.tool === "gstack" && s.skill === "checkpoint")).toBe(true);
  });

  it("recommends subagent for dev phase", () => {
    const strategies = resolveStrategiesForPhase("dev", "demo");
    expect(strategies.some((s) => s.label.includes("subagent-driven-development"))).toBe(true);
  });

  it("formatCompressHooksPlain lists harness-check hints", () => {
    const text = formatCompressHooksPlain("demo", "task");
    expect(text).toContain("压缩策略");
    expect(text).toContain("harness-check");
    expect(text).toContain("superpowers");
  });

  it("merges into harness context for change phase", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "taiyi-harness-tok-"));
    const ctx = getHarnessContext(tmp, "feat", "change");
    expect(ctx.hooks.some((h) => h.command?.includes("token compress"))).toBe(true);
    expect(ctx.hooks.some((h) => h.tool === "gstack" && h.skill === "checkpoint")).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("tokenCompressHarnessHooks are all optional", () => {
    const hooks = tokenCompressHarnessHooks("dev", "x");
    expect(hooks.length).toBeGreaterThan(0);
    expect(hooks.every((h) => h.optional)).toBe(true);
  });
});
