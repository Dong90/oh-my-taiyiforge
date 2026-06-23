/**
 * Task DAG — dependency-aware task scheduler.
 * Parses TASK.md slices, builds dependency graph, produces parallel execution waves.
 */

export type TaskSlice = {
  id: string;
  label: string;
  dependencies: string;
  parallelizable: boolean;
};

export type SliceDependency = {
  dependsOn: string[];
  dependedBy: string[];
  canParallelize: boolean;
};

export type ExecutionWave = {
  name: string;
  sliceIds: string[];
};

export type ExecutionPlan = {
  waves: ExecutionWave[];
  totalSlices: number;
  parallelCount: number; // max parallel slices in any wave
  circularDeps: string[]; // circular dependency chains found
};

/** Parse slice dependencies from raw slice data. */
export function parseSliceDependencies(slices: TaskSlice[]): Map<string, SliceDependency> {
  const map = new Map<string, SliceDependency>();
  for (const s of slices) {
    const deps = s.dependencies
      ? s.dependencies.split(",").map(d => d.trim()).filter(Boolean)
      : [];
    map.set(s.id, {
      dependsOn: deps,
      dependedBy: [],
      canParallelize: s.parallelizable,
    });
  }
  // Build reverse edges
  for (const [id, dep] of map) {
    for (const d of dep.dependsOn) {
      const target = map.get(d);
      if (target) target.dependedBy.push(id);
    }
  }
  return map;
}

/** Build execution plan: topological sort into waves of parallelizable slices. */
export function buildExecutionPlan(slices: TaskSlice[], maxParallel = 4): ExecutionPlan {
  if (slices.length === 0) {
    return { waves: [], totalSlices: 0, parallelCount: 0, circularDeps: [] };
  }

  const deps = parseSliceDependencies(slices);
  const completed = new Set<string>();
  const waves: ExecutionWave[] = [];
  const circularDeps: string[] = [];

  let remaining = slices.length;
  let waveNum = 1;
  let maxParallelFound = 0;

  while (remaining > 0) {
    // Find all slices whose dependencies are satisfied
    const ready: string[] = [];
    for (const [id, dep] of deps) {
      if (completed.has(id)) continue;
      if (dep.dependsOn.every(d => completed.has(d))) {
        ready.push(id);
      }
    }

    // Circular dependency detection: no progress but still have remaining
    if (ready.length === 0) {
      for (const [id, dep] of deps) {
        if (!completed.has(id)) {
          circularDeps.push(`${id} → [${dep.dependsOn.filter(d => !completed.has(d)).join(", ")}]`);
        }
      }
      break;
    }

    // Limit to maxParallel per wave
    const waveSlices = ready.slice(0, maxParallel);
    maxParallelFound = Math.max(maxParallelFound, waveSlices.length);

    // Put overflow into next wave
    const waveName = waveNum === 1 && deps.size === slices.length && ready.length === slices.length
      ? "Wave 1 (all independent, full parallel)"
      : `Wave ${waveNum}`;

    waves.push({ name: waveName, sliceIds: waveSlices });
    for (const id of waveSlices) {
      completed.add(id);
      remaining--;
    }
    waveNum++;
  }

  return {
    waves,
    totalSlices: slices.length,
    parallelCount: maxParallelFound,
    circularDeps,
  };
}
