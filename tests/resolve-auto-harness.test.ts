import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveAutoHarness } from "../src/core/resolve-auto-harness.js";

describe("resolveAutoHarness", () => {
  const prev = process.env.TAIYI_AUTO_HARNESS;

  afterEach(() => {
    if (prev === undefined) delete process.env.TAIYI_AUTO_HARNESS;
    else process.env.TAIYI_AUTO_HARNESS = prev;
  });

  it("init default is false without flags", () => {
    delete process.env.TAIYI_AUTO_HARNESS;
    expect(resolveAutoHarness(["init", "x"], false)).toBe(false);
  });

  it("new default is false without flags", () => {
    delete process.env.TAIYI_AUTO_HARNESS;
    expect(resolveAutoHarness(["new", "title"], false)).toBe(false);
  });

  it("--auto enables new", () => {
    expect(resolveAutoHarness(["new", "t", "--auto"], false)).toBe(true);
  });

  it("--no-auto overrides new default", () => {
    expect(resolveAutoHarness(["new", "t", "--no-auto"], true)).toBe(false);
  });

  it("TAIYI_AUTO_HARNESS=1 overrides new default", () => {
    process.env.TAIYI_AUTO_HARNESS = "1";
    expect(resolveAutoHarness(["new", "t"], false)).toBe(true);
  });
});
