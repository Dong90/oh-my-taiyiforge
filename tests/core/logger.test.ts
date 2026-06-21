import { describe, it, expect } from "vitest";
import { TaiyiLogger, setLogger, getLogger } from "../../src/core/logger.js";

describe("TaiyiLogger", () => {
  it("respects TAIYI_LOG_LEVEL=debug and shows debug messages", () => {
    const logs: string[] = [];
    const logger = new TaiyiLogger({ level: "debug", sink: (m) => logs.push(m) });
    logger.debug("test debug");
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain("test debug");
  });

  it("hides debug messages when level=info", () => {
    const logs: string[] = [];
    const logger = new TaiyiLogger({ level: "info", sink: (m) => logs.push(m) });
    logger.debug("should not appear");
    expect(logs.length).toBe(0);
  });

  it("includes structured fields in output", () => {
    const logs: string[] = [];
    const logger = new TaiyiLogger({ level: "info", sink: (m) => logs.push(m) });
    logger.info("phase complete", { slug: "test", phase: "dev" });
    expect(logs[0]).toContain("phase complete");
    expect(logs[0]).toContain("slug");
    expect(logs[0]).toContain("test");
  });

  it("reads level from TAIYI_LOG_LEVEL env var", () => {
    process.env.TAIYI_LOG_LEVEL = "warn";
    const logger = new TaiyiLogger({ sink: (m) => {} });
    expect(logger.level).toBe("warn");
    delete process.env.TAIYI_LOG_LEVEL;
  });

  it("logs error with stack trace when Error object passed", () => {
    const logs: string[] = [];
    const logger = new TaiyiLogger({ level: "error", sink: (m) => logs.push(m) });
    logger.error("something broke", new Error("test error"));
    expect(logs[0]).toContain("test error");
  });

  it("getLogger returns singleton", () => {
    const a = getLogger();
    const b = getLogger();
    expect(a).toBe(b);
  });

  it("setLogger replaces singleton", () => {
    const custom = new TaiyiLogger({ level: "debug", sink: () => {} });
    setLogger(custom);
    expect(getLogger()).toBe(custom);
    // Reset
    setLogger(new TaiyiLogger());
  });
});
