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
  /** 来自 .taiyi/archive/ 时为 true */
  archived?: boolean;
};

export type ListChangesOptions = {
  /** 含 completed / aborted（默认仅 workflowActive） */
  includeAll?: boolean;
  /**
   * 含 .taiyi/archive/：
   * - 仅 --archived → 只列 archive/
   * - --all --archived → changes/（全状态）+ archive/
   */
  includeArchived?: boolean;
};

function summaryFromState(
  state: ChangeState,
  archived = false,
): ChangeSummary {
  const skipped = state.skippedPhases ?? [];
  const workflowCompleted = isWorkflowCompleted(state);
  const workflowAborted = isChangeAborted(state);
  return {
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
    archived,
  };
}

function readChangeSummary(statePath: string, archived = false): ChangeSummary | null {
  if (!fs.existsSync(statePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, "utf8")) as ChangeState;
    return summaryFromState(normalizeState(raw), archived);
  } catch {
    return null;
  }
}

function scanChangesDir(changesDir: string, archived: boolean): ChangeSummary[] {
  if (!fs.existsSync(changesDir)) return [];
  const out: ChangeSummary[] = [];
  for (const ent of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const summary = readChangeSummary(path.join(changesDir, ent.name, "state.json"), archived);
    if (summary) out.push(summary);
  }
  return out;
}

export function listChanges(taiyiRoot: string, options?: ListChangesOptions): ChangeSummary[] {
  const wantArchived = options?.includeArchived === true;
  const wantAllActive = options?.includeAll === true;

  if (wantArchived && !wantAllActive) {
    return scanChangesDir(path.join(taiyiRoot, "archive"), true).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  let active = scanChangesDir(path.join(taiyiRoot, "changes"), false);

  if (!wantAllActive) {
    active = active.filter((c) => c.workflowActive);
  }

  let archived: ChangeSummary[] = [];
  if (wantArchived && wantAllActive) {
    archived = scanChangesDir(path.join(taiyiRoot, "archive"), true);
  }

  return [...active, ...archived].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
