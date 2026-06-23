import { describe, it, expect } from "vitest";
import { tryRepairJson } from "../../src/core/json-repair.js";

describe("Auto-heal JSON — repair common LLM-generated JSON errors", () => {
  it("removes trailing commas in objects", () => {
    const bad = '{"name":"test","value":42,}';
    const result = tryRepairJson(bad);
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.repaired!)).toEqual({ name: "test", value: 42 });
  });

  it("removes trailing commas in arrays", () => {
    const bad = '{"items":["a","b",]}';
    const result = tryRepairJson(bad);
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.repaired!)).toEqual({ items: ["a", "b"] });
  });

  it("adds missing closing braces", () => {
    const bad = '{"name":"test"';
    const result = tryRepairJson(bad);
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.repaired!)).toEqual({ name: "test" });
  });

  it("adds missing closing brackets", () => {
    const bad = '{"items":["a","b"';
    const result = tryRepairJson(bad);
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.repaired!)).toEqual({ items: ["a", "b"] });
  });

  it("fixes nested trailing commas", () => {
    const bad = '{"outer":{"inner":42,},}';
    const result = tryRepairJson(bad);
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.repaired!)).toEqual({ outer: { inner: 42 } });
  });

  it("handles already-valid JSON without changes", () => {
    const good = '{"name":"test","count":42}';
    const result = tryRepairJson(good);
    expect(result.ok).toBe(true);
    expect(result.repaired).toBe(good);
  });

  it("returns error for irreparable JSON", () => {
    const bad = '{name:test'; // unquoted keys and values
    const result = tryRepairJson(bad);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("handles empty input", () => {
    expect(tryRepairJson("").ok).toBe(false);
    expect(tryRepairJson("   ").ok).toBe(false);
  });

  it("repairs combination: trail comma + missing brace", () => {
    const bad = '{"title":"test","items":["a","b",]';
    const result = tryRepairJson(bad);
    expect(result.ok).toBe(true);
    expect(() => JSON.parse(result.repaired!)).not.toThrow();
  });

  it("handles real E2E fixture-style data with trailing comma", () => {
    // Simulate LLM adding trailing comma to last risk item
    const bad = `{"risks":[{"risk":"e2e failure","probability":"中"},]}`;
    const result = tryRepairJson(bad);
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(result.repaired!);
    expect(parsed.risks).toHaveLength(1);
  });
});
