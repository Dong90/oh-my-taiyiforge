import fs from "node:fs";
import path from "node:path";
import type { ChangeState } from "./types.js";

export type ChangeSummary = {
  slug: string;
  currentPhase: string;
  profile: string;
  completed: number;
  total: number;
  complexity?: string;
  updatedAt: string;
};

export function listChanges(taiyiRoot: string): ChangeSummary[] {
  const changesDir = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changesDir)) return [];

  const out: ChangeSummary[] = [];
  for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const statePath = path.join(changesDir, ent.name, "state.json");
    if (!fs.existsSync(statePath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(statePath, "utf8")) as ChangeState;
      const skipped = raw.skippedPhases ?? [];
      out.push({
        slug: raw.slug,
        currentPhase: raw.currentPhase,
        profile: raw.profile ?? "full",
        completed: raw.completedPhases.length,
        total: 9 - skipped.length,
        complexity: raw.complexity?.level,
        updatedAt: raw.updatedAt,
      });
    } catch {
      /* skip corrupt */
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
