/**
 * wave-allocator.ts — Dynamic Wave allocation by topological sort
 *
 * Groups changes into waves respecting dependency order and max concurrency.
 * Same-layer items split by maxConcurrent are labeled 1a/1b (not 1/2) since
 * they can run in parallel — no dependency between them.
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

export function allocateWaves(changes: ChangeDep[], maxConcurrent: number = 5): WaveGroup[] {
  const waves: WaveGroup[] = [];
  if (changes.length === 0) return waves;
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
      const leftover = changes.filter((c) => remaining.has(c.slug));
      waves.push({ layer, sub: "a", label: `Wave ${layer}`, changes: leftover });
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

  return waves;
}
