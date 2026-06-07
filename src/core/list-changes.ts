import fs from "node:fs";
import path from "node:path";
import type { ChangeState } from "./types.js";
import { displayPhase, isChangeAborted, isChangeActive, isWorkflowCompleted } from "./change-status.js";
import { normalizeState } from "./normalize-state.js";

export type ChangeSummary = {
  slug: string;
  currentPhase: string;
  workflowCompleted: boolean;
  workflowAborted: boolean;
  workflowActive: boolean;
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
      const state = normalizeState(raw);
      const skipped = state.skippedPhases ?? [];
      const workflowCompleted = isWorkflowCompleted(state);
      const workflowAborted = isChangeAborted(state);
      out.push({
        slug: state.slug,
        currentPhase: displayPhase(state),
        workflowCompleted,
        workflowAborted,
        workflowActive: isChangeActive(state),
        profile: state.profile ?? "full",
        completed: state.completedPhases.length,
        total: 9 - skipped.length,
        complexity: state.complexity?.level,
        updatedAt: state.updatedAt,
      });
    } catch {
      /* skip corrupt */
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
