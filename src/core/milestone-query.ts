import fs from "node:fs";
import path from "node:path";
import type { ChangeState, PhaseId } from "./types.js";
import { listPhases } from "./phase-registry.js";
import { normalizeState } from "./normalize-state.js";
import {
  displayPhase,
  expectedPhaseCount,
} from "./change-status.js";

// ── Types ──

export type ChangeMilestoneEntry = {
  slug: string;
  title: string;
  currentPhase: string;
  currentPhaseOrder: number;
  totalPhases: number;
  completedPhases: PhaseId[];
  profile: string;
  complexity?: string;
  createdAt: string;
  updatedAt: string;
  daysSinceCreation: number;
  daysSinceUpdate: number;
  isCompleted: boolean;
  isAborted: boolean;
};

export type MilestoneReport = {
  totalChanges: number;
  activeChanges: number;
  completedChanges: number;
  abortedChanges: number;
  totalCompletedPhases: number;
  totalPossiblePhases: number;
  completionPercent: number;
  phaseDistribution: Record<string, number>;
  bottleneckPhase: { phaseId: string; count: number; slugs: string[] } | null;
  changes: ChangeMilestoneEntry[];
};

export type MilestoneQueryOptions = {
  includeArchived?: boolean;
};

// ── Helpers ──

function phaseOrder(phaseId: string): number {
  const found = listPhases().find((p) => p.id === phaseId);
  return found?.order ?? 0;
}

function readStateFile(statePath: string): ChangeState | null {
  if (!fs.existsSync(statePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, "utf8")) as ChangeState;
    return normalizeState(raw);
  } catch {
    return null;
  }
}

function extractTitle(changeDir: string, slug: string): string {
  const changeMd = path.join(changeDir, "CHANGE.md");
  if (!fs.existsSync(changeMd)) return slug;
  try {
    const content = fs.readFileSync(changeMd, "utf8");
    const m = content.match(/^#\s*CHANGE:\s*(.+)$/m);
    return m?.[1]?.trim() || slug;
  } catch {
    return slug;
  }
}

function daysAgo(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

function scanDir(
  baseDir: string,
): ChangeMilestoneEntry[] {
  if (!fs.existsSync(baseDir)) return [];
  const out: ChangeMilestoneEntry[] = [];

  for (const ent of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const changeDir = path.join(baseDir, ent.name);
    const statePath = path.join(changeDir, "state.json");
    const state = readStateFile(statePath);
    if (!state) continue;

    const phase = displayPhase(state);
    const total = expectedPhaseCount(state);
    const completed = state.completedPhases.length;

    out.push({
      slug: state.slug,
      title: extractTitle(changeDir, state.slug),
      currentPhase: phase,
      currentPhaseOrder: phase === "completed" || phase === "aborted"
        ? (phase === "completed" ? total : 1)
        : phaseOrder(phase),
      totalPhases: total,
      completedPhases: state.completedPhases,
      profile: state.profile,
      complexity: state.complexity?.level,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      daysSinceCreation: daysAgo(state.createdAt),
      daysSinceUpdate: daysAgo(state.updatedAt),
      isCompleted: phase === "completed",
      isAborted: phase === "aborted",
    });
  }

  return out;
}

// ── Main ──

export function queryMilestone(
  taiyiRoot: string,
  options?: MilestoneQueryOptions,
): MilestoneReport {
  const changesDir = path.join(taiyiRoot, "changes");
  const allActive = scanDir(changesDir);

  let allArchived: ChangeMilestoneEntry[] = [];
  if (options?.includeArchived) {
    const archiveDir = path.join(taiyiRoot, "archive");
    allArchived = scanDir(archiveDir);
  }

  const changes = [...allActive, ...allArchived].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  const activeChanges = changes.filter((c) => !c.isCompleted && !c.isAborted).length;
  const completedChanges = changes.filter((c) => c.isCompleted).length;
  const abortedChanges = changes.filter((c) => c.isAborted).length;

  let totalCompleted = 0;
  let totalPossible = 0;
  for (const c of changes) {
    totalCompleted += c.completedPhases.length;
    totalPossible += c.totalPhases;
  }

  // Phase distribution (where each active change is currently)
  const phaseDistribution: Record<string, number> = {};
  for (const c of changes) {
    if (c.isCompleted || c.isAborted) continue;
    phaseDistribution[c.currentPhase] = (phaseDistribution[c.currentPhase] ?? 0) + 1;
  }

  // Bottleneck: phase with the most active changes stuck
  let bottleneck: { phaseId: string; count: number; slugs: string[] } | null = null;
  for (const [phaseId, count] of Object.entries(phaseDistribution)) {
    if (!bottleneck || count > bottleneck.count) {
      const slugs = changes
        .filter((c) => !c.isCompleted && !c.isAborted && c.currentPhase === phaseId)
        .map((c) => c.slug);
      bottleneck = { phaseId, count, slugs };
    }
  }

  // Ignore "change" as bottleneck if it's the first phase (too trivial)
  if (bottleneck?.phaseId === "change" && bottleneck.count <= 1) {
    bottleneck = null;
  }

  return {
    totalChanges: changes.length,
    activeChanges,
    completedChanges,
    abortedChanges,
    totalCompletedPhases: totalCompleted,
    totalPossiblePhases: totalPossible,
    completionPercent: totalPossible > 0
      ? Math.round((totalCompleted / totalPossible) * 100)
      : 0,
    phaseDistribution,
    bottleneckPhase: bottleneck,
    changes,
  };
}
