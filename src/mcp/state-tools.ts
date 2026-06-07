import path from "node:path";
import fs from "node:fs";
import { resolveActiveSlug } from "../core/active-slug.js";
import { buildEngineTruth } from "../core/engine-truth.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { handoffExists, writeHandoff } from "../core/handoff.js";
import { listChanges } from "../core/list-changes.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolveTemplatesDir } from "../core/package-root.js";
import { formatPhaseProgressLine } from "../core/format-guide.js";
import { scanArtifactTokens } from "../core/token/scan-artifacts.js";
import { loadTokenBudgetConfig } from "../core/token/budget-config.js";
import { WorkflowEngine } from "../core/workflow-engine.js";
import type { ChangeState } from "../core/types.js";
import type { EngineTruth } from "../core/engine-truth.js";

export type StateListActiveResult = {
  changes: ReturnType<typeof listChanges>;
  active: ReturnType<typeof listChanges>;
  inferredSlug?: string;
  inferError?: string;
};

export function resolveWorkspaceDir(cwd = process.cwd()): string {
  return process.env.TAIYI_WORKSPACE?.trim() || cwd;
}

export function taiyiStateListActive(workspaceDir: string): StateListActiveResult {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const changes = listChanges(taiyiRoot);
  const active = changes.filter((c) => c.workflowActive);
  const inferred = resolveActiveSlug(taiyiRoot);
  return {
    changes,
    active,
    inferredSlug: inferred.ok ? inferred.slug : undefined,
    inferError: inferred.ok ? undefined : inferred.error,
  };
}

export function taiyiStateGetStatus(
  workspaceDir: string,
  slug?: string,
): { ok: true; slug: string; engineTruth: EngineTruth; statusLine: string } | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const engine = new WorkflowEngine(taiyiRoot, resolveTemplatesDir(import.meta.url));
  const state = engine.getState(resolved.slug);
  if (!state) return { ok: false, error: `Change not found: ${resolved.slug}` };

  const guide = buildPhaseGuide(taiyiRoot, resolved.slug, state, workspaceDir);
  const changeDir = path.join(taiyiRoot, "changes", resolved.slug);
  const engineTruth = buildEngineTruth(state, guide, {
    handoffExists: handoffExists(changeDir),
  });
  return {
    ok: true,
    slug: resolved.slug,
    engineTruth,
    statusLine: formatPhaseProgressLine(guide),
  };
}

export function taiyiStateHandoff(
  workspaceDir: string,
  slug?: string,
  note?: string,
): { ok: true; slug: string; path: string; engineTruth: EngineTruth } | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const engine = new WorkflowEngine(taiyiRoot, resolveTemplatesDir(import.meta.url));
  const state = engine.getState(resolved.slug);
  if (!state) return { ok: false, error: `Change not found: ${resolved.slug}` };

  const guide = buildPhaseGuide(taiyiRoot, resolved.slug, state, workspaceDir);
  const statusLine = formatPhaseProgressLine(guide);
  const changeDir = path.join(taiyiRoot, "changes", resolved.slug);
  const tokenCfg = loadTokenBudgetConfig();
  const artifactScan = scanArtifactTokens(changeDir);
  const compressHint =
    artifactScan.total > tokenCfg.compressThreshold
      ? `工件约 ${artifactScan.total.toLocaleString()} tokens（阈值 ${tokenCfg.compressThreshold.toLocaleString()}）。恢复后先 /taiyi:token compress ${resolved.slug}`
      : undefined;
  const { path: filePath } = writeHandoff({
    changeDir,
    state,
    note,
    statusLine,
    compressHint,
  });
  const engineTruth = buildEngineTruth(state, guide, { handoffExists: true });
  return { ok: true, slug: resolved.slug, path: filePath, engineTruth };
}

export function taiyiStateCancel(
  workspaceDir: string,
  slug?: string,
): { ok: true; slug: string; workflowStatus: "aborted" } | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const engine = new WorkflowEngine(taiyiRoot, resolveTemplatesDir(import.meta.url));
  const result = engine.abortChange(resolved.slug);
  if (!result.ok) return { ok: false, error: result.error ?? "abort failed" };
  return { ok: true, slug: resolved.slug, workflowStatus: "aborted" };
}

export function taiyiStateRead(
  workspaceDir: string,
  slug?: string,
): { ok: true; slug: string; path: string; state: ChangeState } | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return { ok: false, error: resolved.error };

  const statePath = path.join(taiyiRoot, "changes", resolved.slug, "state.json");
  if (!fs.existsSync(statePath)) {
    return { ok: false, error: `Change not found: ${resolved.slug}` };
  }

  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as ChangeState;
    return { ok: true, slug: resolved.slug, path: statePath, state };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : `Invalid state.json: ${resolved.slug}`,
    };
  }
}
