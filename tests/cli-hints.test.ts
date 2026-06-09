import { describe, expect, it } from "vitest";
import {
  formatChangeNotFound,
  formatInvalidProfile,
  formatMultipleActiveChanges,
  formatWrongPhaseError,
  parseProfileFlag,
} from "../src/core/cli-hints.js";

describe("cli-hints", () => {
  it("parseProfileFlag rejects unknown profile", () => {
    const r = parseProfileFlag(["init", "x", "--profile", "notreal"]);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/notreal/);
      expect(r.error).toMatch(/full, api, ui, lite/);
    }
  });

  it("parseProfileFlag accepts lite", () => {
    const r = parseProfileFlag(["init", "x", "--profile", "lite"]);
    expect(r).toEqual({ ok: true, profile: "lite" });
  });

  it("parseProfileFlag absent flag returns undefined", () => {
    expect(parseProfileFlag(["init", "x"])).toEqual({ ok: true, profile: undefined });
  });

  it("formatMultipleActiveChanges truncates long lists", () => {
    const msg = formatMultipleActiveChanges(["a", "b", "c", "d", "e", "f", "g"], 3);
    expect(msg).toMatch(/7 个进行中/);
    expect(msg).toMatch(/a, b, c/);
    expect(msg).toMatch(/另有 4 个/);
    expect(msg).toMatch(/npx taiyi list/);
  });

  it("formatChangeNotFound includes recovery hints", () => {
    expect(formatChangeNotFound("missing-slug")).toMatch(/init missing-slug --force/);
    expect(formatChangeNotFound("missing-slug")).toMatch(/list --archived/);
  });

  it("formatInvalidProfile lists valid values", () => {
    expect(formatInvalidProfile("bogus")).toMatch(/bogus/);
    expect(formatInvalidProfile("bogus")).toMatch(/--profile lite/);
  });

  it("formatWrongPhaseError includes status and continue hints", () => {
    const msg = formatWrongPhaseError("my-slug", "change", "dev");
    expect(msg).toMatch(/当前阶段为 change/);
    expect(msg).toMatch(/complete dev/);
    expect(msg).toMatch(/\/taiyi:status my-slug/);
    expect(msg).toMatch(/\/taiyi:continue my-slug/);
  });
});
