import fs from "node:fs";
import path from "node:path";
import type { ChangeState } from "./types.js";
import { normalizeState } from "./normalize-state.js";
import { listChanges, type ChangeSummary } from "./list-changes.js";
import { buildPhaseGuide } from "./phase-guide.js";
import { buildHarnessPlan } from "./harness-runner.js";
import { getNextPhase } from "./phase-registry.js";
import { resolveChangeDir } from "./taiyi-archive.js";
import { expectedPhaseCount, isWorkflowCompleted } from "./change-status.js";

export type CiChangeReport = {
  slug: string;
  phase: string;
  profile: string;
  autoHarness: boolean;
  qualityReady: boolean;
  artifactExists: boolean;
  completed: number;
  total: number;
  blockers: string[];
  ok: boolean;
};

export type CiVerifyReport = {
  ok: boolean;
  workspaceDir: string;
  taiyiRoot: string;
  changeCount: number;
  changes: CiChangeReport[];
  notes: string[];
};

function loadState(changeDir: string): ChangeState | null {
  const p = path.join(changeDir, "state.json");
  if (!fs.existsSync(p)) return null;
  try {
    return normalizeState(JSON.parse(fs.readFileSync(p, "utf8")) as ChangeState);
  } catch {
    return null;
  }
}

function isIntegrationDone(state: ChangeState): boolean {
  return state.completedPhases.includes("integration");
}

export function verifyWorkspaceCi(
  workspaceDir: string,
  taiyiRoot: string,
  options?: { slug?: string; requireComplete?: boolean },
): CiVerifyReport {
  const notes: string[] = [];
  const changesDir = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changesDir)) {
    return {
      ok: true,
      workspaceDir,
      taiyiRoot,
      changeCount: 0,
      changes: [],
      notes: ["无 .taiyi/changes/，跳过变更校验（PR 无 Taiyi 变更时正常）"],
    };
  }

  const listOpts = {
    includeAll: true,
    includeArchived: Boolean(options?.slug),
  };
  const summaries = listChanges(taiyiRoot, listOpts);
  let targets = options?.slug
    ? summaries.filter((c) => c.slug === options.slug)
    : summaries.filter((c) => c.workflowActive || c.archived);

  if (options?.slug && targets.length === 0) {
    const archivedDir = resolveChangeDir(taiyiRoot, options.slug);
    if (archivedDir) {
      const state = loadState(archivedDir);
      if (state) {
        targets = [
          {
            slug: options.slug,
            currentPhase: state.currentPhase,
            workflowCompleted: isWorkflowCompleted(state),
            workflowAborted: state.workflowStatus === "aborted",
            workflowActive: false,
            profile: state.profile ?? "full",
            completed: state.completedPhases.length,
            total: expectedPhaseCount(state),
            updatedAt: state.updatedAt ?? "",
            archived: true,
          },
        ];
        notes.push(`${options.slug}: 已在 .taiyi/archive/（归档后 verify）`);
      }
    }
  }

  if (options?.slug && targets.length === 0) {
    return {
      ok: false,
      workspaceDir,
      taiyiRoot,
      changeCount: 0,
      changes: [],
      notes: [`未找到 slug: ${options.slug}`],
    };
  }

  const reports: CiChangeReport[] = [];

  for (const s of targets) {
    const changeDir = resolveChangeDir(taiyiRoot, s.slug) ?? path.join(changesDir, s.slug);
    const state = loadState(changeDir);
    if (!state) continue;

    const guide = buildPhaseGuide(taiyiRoot, s.slug, state, workspaceDir);
    const plan = buildHarnessPlan(workspaceDir, taiyiRoot, state);
    const blockers = isWorkflowCompleted(state) ? [] : [...plan.blockers];

    if (!guide.qualityReady && !isIntegrationDone(state)) {
      blockers.push(`当前阶段 ${guide.currentPhase} 工件未通过质量校验`);
    }
    if (options?.requireComplete && !isIntegrationDone(state)) {
      blockers.push("CI requireComplete: integration 阶段未完成");
    }

    const next = getNextPhase(state.currentPhase, state.skippedPhases ?? []);
    const phaseTotal = expectedPhaseCount(state);
    if (isIntegrationDone(state) && next === null) {
      notes.push(`${s.slug}: ${phaseTotal} 阶段已完成${s.archived ? "（已归档）" : ""}`);
    }

    reports.push({
      slug: s.slug,
      phase: guide.workflowCompleted ? "completed" : guide.currentPhase,
      profile: guide.profile ?? state.profile,
      autoHarness: state.autoHarness ?? false,
      qualityReady: guide.qualityReady,
      artifactExists: guide.artifactExists,
      completed: state.completedPhases.length,
      total: expectedPhaseCount(state),
      blockers,
      ok: blockers.length === 0,
    });
  }

  const ok = reports.every((r) => r.ok);
  return {
    ok,
    workspaceDir,
    taiyiRoot,
    changeCount: reports.length,
    changes: reports,
    notes,
  };
}

export function formatCiVerifyPlain(report: CiVerifyReport): string {
  const lines: string[] = [];
  lines.push(`TaiyiForge CI verify — ${report.ok ? "PASS" : "FAIL"}`);
  lines.push(`workspace: ${report.workspaceDir}`);
  lines.push(`changes: ${report.changeCount}`);
  for (const c of report.changes) {
    lines.push(
      `\n[${c.ok ? "✓" : "✗"}] ${c.slug}  phase=${c.phase}  ${c.completed}/${c.total}  auto=${c.autoHarness}`,
    );
    if (c.blockers.length) {
      for (const b of c.blockers) lines.push(`    - ${b}`);
    }
  }
  for (const n of report.notes) lines.push(`\n${n}`);
  return lines.join("\n");
}
