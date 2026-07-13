import fs from "node:fs";
import path from "node:path";

export interface FrCoverageResult {
  passed: boolean;
  totalFrs: number;
  coveredFrs: number;
  uncoveredFrs: string[];
  warnings: string[];
}

/**
 * Check that every functional requirement (with caller_module in scope) has
 * at least one task slice covering it. Runs during task phase quality gate
 * to prevent "defined FR but no implementing slice" gaps.
 */
export function checkFrSliceCoverage(
  changeDir: string,
  scopeFiles: string[] = [],
): FrCoverageResult {
  const warnings: string[] = [];

  const reqPath = path.join(changeDir, "requirement.json");
  if (!fs.existsSync(reqPath)) {
    return {
      passed: true, totalFrs: 0, coveredFrs: 0, uncoveredFrs: [],
      warnings: ["requirement.json not found — coverage check skipped"],
    };
  }

  let reqData: Record<string, unknown>;
  try {
    reqData = JSON.parse(fs.readFileSync(reqPath, "utf8"));
  } catch {
    return {
      passed: false, totalFrs: 0, coveredFrs: 0, uncoveredFrs: [],
      warnings: ["requirement.json parse error — cannot verify FR coverage"],
    };
  }

  const frModules = (reqData.functional_requirements as Array<{
    module: string;
    items: Array<{
      id: string;
      description: string;
      trigger?: string;
      caller_module?: string;
      blocked_by?: string;
    }>;
  }>) ?? [];

  const frsNeedingCoverage = new Map<string, { module: string; caller_module?: string }>();

  for (const mod of frModules) {
    for (const item of mod.items ?? []) {
      if (item.blocked_by) continue;

      const callerInScope =
        scopeFiles.length === 0 ||
        !item.caller_module ||  /* FR without known caller → always in scope */
        scopeFiles.some((f) =>
          item.caller_module!.includes(f) || f.includes(item.caller_module!)
        );

      if (callerInScope || scopeFiles.length === 0) {
        frsNeedingCoverage.set(item.id, {
          module: mod.module,
          caller_module: item.caller_module,
        });
      } else if (item.caller_module) {
        warnings.push(
          `FR ${item.id}: caller_module "${item.caller_module}" not in scope — if out of scope, add blocked_by`,
        );
      }
    }
  }

  if (frsNeedingCoverage.size === 0) {
    return { passed: true, totalFrs: 0, coveredFrs: 0, uncoveredFrs: [], warnings };
  }

  const taskPath = path.join(changeDir, "task.json");
  if (!fs.existsSync(taskPath)) {
    return {
      passed: false, totalFrs: frsNeedingCoverage.size, coveredFrs: 0,
      uncoveredFrs: Array.from(frsNeedingCoverage.keys()),
      warnings: [...warnings, "task.json not found — all FRs uncovered"],
    };
  }

  let taskData: Record<string, unknown>;
  try {
    taskData = JSON.parse(fs.readFileSync(taskPath, "utf8"));
  } catch {
    return {
      passed: false, totalFrs: frsNeedingCoverage.size, coveredFrs: 0,
      uncoveredFrs: Array.from(frsNeedingCoverage.keys()),
      warnings: [...warnings, "task.json parse error"],
    };
  }

  const slices = (taskData.slices as Array<{ id: string; covers_frs?: string[] }>) ?? [];
  const coveredFrIds = new Set<string>();
  for (const slice of slices) {
    for (const frId of slice.covers_frs ?? []) {
      coveredFrIds.add(frId);
    }
  }

  const uncoveredFrs: string[] = [];
  for (const [frId, frInfo] of frsNeedingCoverage) {
    if (!coveredFrIds.has(frId)) {
      uncoveredFrs.push(frId);
    }
  }

  for (const frId of uncoveredFrs) {
    const info = frsNeedingCoverage.get(frId);
    warnings.push(
      `FR ${frId} (${info?.module ?? "?"}) has no implementing slice — add covers_frs: ["${frId}"]`,
    );
  }

  return {
    passed: uncoveredFrs.length === 0,
    totalFrs: frsNeedingCoverage.size,
    coveredFrs: frsNeedingCoverage.size - uncoveredFrs.length,
    uncoveredFrs,
    warnings,
  };
}
