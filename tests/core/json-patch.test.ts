import { describe, expect, it } from "vitest";
import { applyJsonPatches } from "../../src/core/json-patch.js";

describe("applyJsonPatches", () => {
  const base = {
    title: "用户登录",
    features: ["邮箱登录", "手机号登录"],
    acceptance_criteria: [
      { id: "AC-01", description: "能登录", is_checked: false },
      { id: "AC-02", description: "显示错误", is_checked: true },
    ],
  };

  it("replace: updates a top-level field", () => {
    const patches = [{ op: "replace" as const, path: "/title", value: "新的标题" }];
    const result = applyJsonPatches(base, patches);
    expect(result.title).toBe("新的标题");
    expect(result.features).toEqual(base.features); // unchanged
  });

  it("replace: updates a nested array element", () => {
    const patches = [
      { op: "replace" as const, path: "/features/1", value: "微信登录" },
    ];
    const result = applyJsonPatches(base, patches);
    expect(result.features[1]).toBe("微信登录");
  });

  it("replace: updates is_checked in acceptance_criteria", () => {
    const patches = [
      { op: "replace" as const, path: "/acceptance_criteria/0/is_checked", value: true },
    ];
    const result = applyJsonPatches(base, patches);
    expect(result.acceptance_criteria[0].is_checked).toBe(true);
    expect(result.acceptance_criteria[1].is_checked).toBe(true); // unchanged
  });

  it("add: inserts new item to array", () => {
    const patches = [
      { op: "add" as const, path: "/features/-", value: "微信登录" },
    ];
    const result = applyJsonPatches(base, patches);
    expect(result.features).toHaveLength(3);
    expect(result.features[2]).toBe("微信登录");
  });

  it("add: adds a new top-level field", () => {
    const patches = [
      { op: "add" as const, path: "/priority", value: "high" },
    ];
    const result = applyJsonPatches(base, patches);
    expect((result as Record<string, unknown>).priority).toBe("high");
  });

  it("remove: deletes an array element", () => {
    const patches = [
      { op: "remove" as const, path: "/features/0" },
    ];
    const result = applyJsonPatches(base, patches);
    expect(result.features).toHaveLength(1);
    expect(result.features[0]).toBe("手机号登录");
  });

  it("multiple patches applied in order", () => {
    const patches = [
      { op: "replace" as const, path: "/title", value: "新标题" },
      { op: "add" as const, path: "/features/-", value: "微信登录" },
      { op: "replace" as const, path: "/acceptance_criteria/0/is_checked", value: true },
    ];
    const result = applyJsonPatches(base, patches);
    expect(result.title).toBe("新标题");
    expect(result.features).toHaveLength(3);
    expect(result.acceptance_criteria[0].is_checked).toBe(true);
  });

  it("throws on invalid path", () => {
    const patches = [
      { op: "replace" as const, path: "/nonexistent/field", value: "x" },
    ];
    expect(() => applyJsonPatches(base, patches)).toThrow();
  });

  it("throws on path with array index out of bounds", () => {
    const patches = [
      { op: "replace" as const, path: "/features/99", value: "x" },
    ];
    expect(() => applyJsonPatches(base, patches)).toThrow();
  });
});
