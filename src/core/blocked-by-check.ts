import fs from "node:fs";
import path from "node:path";

export interface BlockedByResult {
  unresolved: string[];
  pending: string[];
  warnings: string[];
}

export function checkBlockedByDeps(
  changeDir: string,
  taiyiRoot: string,
): BlockedByResult {
  const unresolved: string[] = [];
  const pending: string[] = [];
  const warnings: string[] = [];

  const reqPath = path.join(changeDir, "requirement.json");
  if (!fs.existsSync(reqPath)) {
    return { unresolved, pending, warnings };
  }

  let reqData: Record<string, unknown>;
  try {
    reqData = JSON.parse(fs.readFileSync(reqPath, "utf8"));
  } catch {
    return { unresolved, pending, warnings };
  }

  const frModules = (reqData.functional_requirements as Array<{
    module: string;
    items: Array<{ id: string; blocked_by?: string }>;
  }>) ?? [];

  const blockedBySet = new Set<string>();
  for (const mod of frModules) {
    for (const item of mod.items ?? []) {
      if (item.blocked_by) blockedBySet.add(item.blocked_by);
    }
  }

  if (blockedBySet.size === 0) return { unresolved, pending, warnings };

  const changesDir = path.join(taiyiRoot, "changes");
  const archiveDir = path.join(taiyiRoot, "archive");

  for (const depSlug of blockedBySet) {
    const statePaths = [
      path.join(changesDir, depSlug, "state.json"),
      path.join(archiveDir, depSlug, "state.json"),
    ];

    let found = false;
    let completed = false;

    for (const sp of statePaths) {
      if (!fs.existsSync(sp)) continue;
      try {
        const s = JSON.parse(fs.readFileSync(sp, "utf8"));
        found = true;
        if (s.workflowStatus === "completed" || s.completedPhases?.includes("integration")) {
          completed = true;
        }
        break;
      } catch { /* skip corrupt state */ }
    }

    if (!found) {
      unresolved.push(depSlug);
      warnings.push(`blocked_by "${depSlug}" points to non-existent change — check slug or convert to correct dependency`);
    } else if (!completed) {
      pending.push(depSlug);
      warnings.push(`blocked_by "${depSlug}" points to incomplete change — wait for ${depSlug} to finish`);
    }
  }

  return { unresolved, pending, warnings };
}
