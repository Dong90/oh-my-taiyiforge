/**
 * wave-allocator.ts — Dynamic Wave allocation by topological sort
 *
 * Groups changes into waves respecting dependency order and max concurrency.
 * Same-layer items split by maxConcurrent are labeled 1a/1b (not 1/2) since
 * they can run in parallel — no dependency between them.
 *
 * 环检测（best-effort）：如果拓扑排序无法推进（环依赖），剩余节点塞入
 * 最终 wave 同时推入 `circularDeps` 字段。需要严格环检测请用 `task-dag.ts`。
 */

export interface ChangeDep {
  slug: string;
  dependsOn: string[];
}

export interface WaveGroup {
  /** 1-based topological layer number */
  layer: number;
  /** "a", "b", "c"... for sub-waves within the same layer */
  sub: string;
  label: string; // e.g. "Wave 1a", "Wave 2"
  changes: ChangeDep[];
}

export interface WaveAllocationResult {
  waves: WaveGroup[];
  circularDeps: string[]; // 环依赖链（空数组 = 无环）
}

/** 环检测版：返回 waves + circularDeps */
export function allocateWavesWithCycleCheck(
  changes: ChangeDep[],
  maxConcurrent: number = 5,
): WaveAllocationResult {
  const waves: WaveGroup[] = [];
  const circularDeps: string[] = [];
  if (changes.length === 0) return { waves, circularDeps };
  if (maxConcurrent < 1) maxConcurrent = 1;

  const slugSet = new Set(changes.map((c) => c.slug));
  const remaining = new Set(changes.map((c) => c.slug));
  const satisfied = new Set<string>();
  let layer = 0;

  while (remaining.size > 0) {
    layer++;
    const ready = changes.filter(
      (c) =>
        remaining.has(c.slug) &&
        c.dependsOn.every((d) => satisfied.has(d) || !slugSet.has(d)),
    );

    if (ready.length === 0) {
      for (const c of changes) {
        if (remaining.has(c.slug)) {
          const unsatisfied = c.dependsOn.filter((d) => slugSet.has(d) && !satisfied.has(d));
          if (unsatisfied.length > 0) {
            circularDeps.push(`${c.slug} → [${unsatisfied.join(", ")}]`);
          }
        }
      }
      waves.push({ layer, sub: "a", label: `Wave ${layer} (循环依赖)`, changes: changes.filter((c) => remaining.has(c.slug)) });
      break;
    }

    const alpha = "abcdefghijklmnopqrstuvwxyz";
    let subIdx = 0;
    for (let i = 0; i < ready.length; i += maxConcurrent) {
      const subChanges = ready.slice(i, i + maxConcurrent);
      for (const c of subChanges) {
        remaining.delete(c.slug);
        satisfied.add(c.slug);
      }
      const subLabel = alpha[subIdx] ?? String(subIdx);
      const label = ready.length <= maxConcurrent
        ? `Wave ${layer}`
        : `Wave ${layer}${subLabel}`;
      waves.push({ layer, sub: subLabel, label, changes: subChanges });
      subIdx++;
    }
  }

  return { waves, circularDeps };
}

/** 旧 API：保持向后兼容，只返回 waves（环会被塞进最后 wave） */
export function allocateWaves(changes: ChangeDep[], maxConcurrent: number = 5): WaveGroup[] {
  return allocateWavesWithCycleCheck(changes, maxConcurrent).waves;
}
