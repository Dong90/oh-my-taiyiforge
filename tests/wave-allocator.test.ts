import { describe, expect, it } from "vitest";
import { allocateWaves, type ChangeDep } from "../src/core/wave-allocator.js";

describe("allocateWaves", () => {
  it("全部独立 → 1 个 Wave", () => {
    const changes: ChangeDep[] = [
      { slug: "a", dependsOn: [] },
      { slug: "b", dependsOn: [] },
      { slug: "c", dependsOn: [] },
    ];
    const waves = allocateWaves(changes, 5);
    expect(waves).toHaveLength(1);
    expect(waves[0].label).toBe("Wave 1");
    expect(waves[0].changes.map((c) => c.slug).sort()).toEqual(["a", "b", "c"]);
  });

  it("超过 maxConcurrent → 拆成 1a/1b 子层", () => {
    const changes: ChangeDep[] = [
      { slug: "a", dependsOn: [] }, { slug: "b", dependsOn: [] },
      { slug: "c", dependsOn: [] }, { slug: "d", dependsOn: [] },
      { slug: "e", dependsOn: [] }, { slug: "f", dependsOn: [] },
      { slug: "g", dependsOn: [] },
    ];
    const waves = allocateWaves(changes, 3);
    expect(waves).toHaveLength(3);
    expect(waves[0].label).toBe("Wave 1a");
    expect(waves[0].changes).toHaveLength(3);
    expect(waves[1].label).toBe("Wave 1b");
    expect(waves[1].changes).toHaveLength(3);
    expect(waves[2].label).toBe("Wave 1c");
    expect(waves[2].changes).toHaveLength(1);
  });

  it("线性依赖链 → N 个 Wave", () => {
    const changes: ChangeDep[] = [
      { slug: "a", dependsOn: [] },
      { slug: "b", dependsOn: ["a"] },
      { slug: "c", dependsOn: ["b"] },
    ];
    const waves = allocateWaves(changes, 5);
    expect(waves).toHaveLength(3);
    expect(waves[0].changes.map((c) => c.slug)).toEqual(["a"]);
    expect(waves[0].label).toBe("Wave 1");
    expect(waves[1].changes.map((c) => c.slug)).toEqual(["b"]);
    expect(waves[1].label).toBe("Wave 2");
    expect(waves[2].changes.map((c) => c.slug)).toEqual(["c"]);
    expect(waves[2].label).toBe("Wave 3");
  });

  it("分叉 + 聚合 → 经典 DAG", () => {
    const changes: ChangeDep[] = [
      { slug: "a", dependsOn: [] },
      { slug: "b", dependsOn: ["a"] },
      { slug: "c", dependsOn: ["a"] },
      { slug: "d", dependsOn: ["b", "c"] },
    ];
    const waves = allocateWaves(changes, 5);
    expect(waves).toHaveLength(3);
    expect(waves[0].changes.map((c) => c.slug).sort()).toEqual(["a"]);
    expect(waves[0].label).toBe("Wave 1");
    expect(waves[1].changes.map((c) => c.slug).sort()).toEqual(["b", "c"]);
    expect(waves[1].label).toBe("Wave 2");
    expect(waves[2].changes.map((c) => c.slug).sort()).toEqual(["d"]);
    expect(waves[2].label).toBe("Wave 3");
  });

  it("翻译助手实际案例", () => {
    const changes: ChangeDep[] = [
      { slug: "docker-compose-ci-cd", dependsOn: [] },
      { slug: "data-layer", dependsOn: [] },
      { slug: "observability", dependsOn: [] },
      { slug: "redis-celery", dependsOn: [] },
      { slug: "api-polish", dependsOn: [] },
      { slug: "api-security", dependsOn: ["data-layer"] },
      { slug: "tests", dependsOn: ["data-layer", "api-security"] },
      { slug: "docs", dependsOn: ["data-layer", "api-security", "tests"] },
    ];
    const waves = allocateWaves(changes, 5);
    expect(waves).toHaveLength(4);
    expect(waves[0].label).toBe("Wave 1");
    expect(waves[0].changes.map((c) => c.slug).sort()).toEqual(
      ["api-polish", "data-layer", "docker-compose-ci-cd", "observability", "redis-celery"].sort(),
    );
    expect(waves[1].label).toBe("Wave 2");
    expect(waves[1].changes.map((c) => c.slug)).toEqual(["api-security"]);
    expect(waves[2].label).toBe("Wave 3");
    expect(waves[2].changes.map((c) => c.slug)).toEqual(["tests"]);
    expect(waves[3].label).toBe("Wave 4");
    expect(waves[3].changes.map((c) => c.slug)).toEqual(["docs"]);
  });

  it("空输入 → 空输出", () => {
    const waves = allocateWaves([], 5);
    expect(waves).toHaveLength(0);
  });

  it("不存在的依赖 → 视为已满足", () => {
    const changes: ChangeDep[] = [
      { slug: "a", dependsOn: ["nonexistent"] },
      { slug: "b", dependsOn: [] },
    ];
    const waves = allocateWaves(changes, 5);
    expect(waves).toHaveLength(1);
    expect(waves[0].changes.map((c) => c.slug).sort()).toEqual(["a", "b"]);
  });
});
