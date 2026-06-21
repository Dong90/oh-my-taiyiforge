import { describe, it, expect } from "vitest";

describe("Public API surface", () => {
  it("exports core types from index", async () => {
    const taiyi = await import("../../src/index.js");
    expect(taiyi.WorkflowEngine).toBeDefined();
    expect(taiyi.listPhases).toBeDefined();
    expect(taiyi.registerCustomPhase).toBeDefined();
    expect(taiyi.TaiyiLogger).toBeDefined();
    expect(taiyi.ChangeLock).toBeDefined();
    expect(taiyi.TemplateEngine).toBeDefined();
    expect(taiyi.renderTemplate).toBeDefined();
    expect(taiyi.buildHarnessPlan).toBeDefined();
  });

  it("exports type symbols", async () => {
    // Types are erased at runtime, but the import shouldn't error
    const taiyi = await import("../../src/index.js");
    expect(typeof taiyi.WorkflowEngine).toBe("function");
    expect(typeof taiyi.TaiyiLogger).toBe("function");
    expect(typeof taiyi.TemplateEngine).toBe("function");
    expect(typeof taiyi.ChangeLock).toBe("function");
  });

  it("WORKFLOW-ENGINE re-exports work", async () => {
    const taiyi = await import("../../src/index.js");
    const stateLookup = {} as Parameters<typeof taiyi.WorkflowEngine.prototype.lookupState>[0];
    expect(typeof stateLookup).toBe("object");
    // Just verify the import worked and types are available
    expect(typeof taiyi.WorkflowEngine.prototype.initChange).toBe("function");
  });
});
