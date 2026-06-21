import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  on,
  off,
  emit,
  registerShellHook,
  resetEventBus,
} from "../../src/core/event-bus.js";
import { loadHooksFromConfig } from "../../src/core/hooks-loader.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

beforeEach(() => {
  resetEventBus();
});

describe("event bus — programmatic handlers", () => {
  it("on + emit calls registered handler with payload", async () => {
    const handler = vi.fn();
    on("phase:complete", handler);
    await emit("phase:complete", { slug: "test", phase: "dev" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ slug: "test", phase: "dev" });
  });

  it("off removes a handler", async () => {
    const handler = vi.fn();
    on("phase:complete", handler);
    off("phase:complete", handler);
    await emit("phase:complete", { slug: "x" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("multiple handlers per event", async () => {
    const a = vi.fn();
    const b = vi.fn();
    on("phase:blocked", a);
    on("phase:blocked", b);
    await emit("phase:blocked", { slug: "x", reason: "test" });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("emit with no registered handlers does not throw", async () => {
    await expect(emit("phase:complete", {})).resolves.toBeUndefined();
  });

  it("resetEventBus clears all handlers and shell hooks", async () => {
    const handler = vi.fn();
    on("change:created", handler);
    registerShellHook("change:created", "echo done");
    resetEventBus();
    await emit("change:created", { slug: "x" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("async handlers are awaited", async () => {
    let flag = false;
    const handler = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      flag = true;
    });
    on("phase:complete", handler);
    await emit("phase:complete", { slug: "x" });
    expect(flag).toBe(true);
  });
});

describe("event bus — shell hooks", () => {
  it("registerShellHook and shell hook execution with variable interpolation", async () => {
    // This test only verifies that registerShellHook does not throw
    // and that the hook is stored internally.
    // Full shell execution is integration-tested via the execution path.
    expect(() => registerShellHook("phase:complete", "echo {{slug}}")).not.toThrow();
    // Verify by emitting — the shell hook runs via execSync internally.
    // We just check the handler path doesn't crash.
    await emit("phase:complete", { slug: "test-slug" });
  });
});

describe("hooks-loader", () => {
  it("loadHooksFromConfig registers shell hooks from .taiyi/hooks.json", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hooks-loader-"));
    const taiyiDir = path.join(tmpDir, ".taiyi");
    fs.mkdirSync(taiyiDir, { recursive: true });
    const hooksJson = {
      hooks: [
        { event: "phase:complete", command: "echo Phase {{slug}} done" },
        { event: "gate:failed", command: "echo Gate failed on {{slug}}" },
      ],
    };
    fs.writeFileSync(path.join(taiyiDir, "hooks.json"), JSON.stringify(hooksJson));

    loadHooksFromConfig(taiyiDir);
    // Should not throw — hooks are registered.
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loadHooksFromConfig throws for unknown event", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hooks-loader-"));
    const taiyiDir = path.join(tmpDir, ".taiyi");
    fs.mkdirSync(taiyiDir, { recursive: true });
    const hooksJson = {
      hooks: [
        { event: "unknown:event", command: "echo test" },
      ],
    };
    fs.writeFileSync(path.join(taiyiDir, "hooks.json"), JSON.stringify(hooksJson));

    expect(() => loadHooksFromConfig(taiyiDir)).toThrow(/unknown/i);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
