import path from "node:path";
import fs from "node:fs";
import { resolveActiveSlug, resolveChangeSlug } from "../core/active-slug.js";
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
import { taiyiStep, taiyiStopMode, taiyiModes, taiyiKeyword, taiyiRemember, taiyiWorkflowSkill, taiyiDoctor, taiyiAudit, taiyiSyncProviders } from "../plugin/handlers.js";
import type { InstallTarget } from "../install/types.js";
import { buildDoctorJsonCompact, type DoctorJsonCompact } from "../core/doctor.js";
import { buildAuditJsonCompact, type AuditJsonCompact } from "../core/workflow-audit.js";
import { resolvePackageRoot } from "../core/package-root.js";

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
    taiyiRoot,
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
  const engineTruth = buildEngineTruth(state, guide, { handoffExists: true, taiyiRoot });
  return { ok: true, slug: resolved.slug, path: filePath, engineTruth };
}

export function taiyiStateCancel(
  workspaceDir: string,
  slug?: string,
): { ok: true; slug: string; workflowStatus: "aborted" } | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveChangeSlug(taiyiRoot, slug);
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

export function taiyiModeStep(
  workspaceDir: string,
  slug?: string,
  mode?: string,
): { ok: boolean; text: string; step?: unknown } {
  const r = taiyiStep(workspaceDir, slug, { mode }, false);
  if (!("step" in r) && "error" in r) {
    return { ok: false, text: String(r.error) };
  }
  const text = "step" in r && r.step && typeof r.step === "object" && "text" in r.step
    ? String((r.step as { text: string }).text)
    : "text" in r
      ? String(r.text)
      : JSON.stringify(r);
  return { ok: r.ok, text, step: "step" in r ? r.step : undefined };
}

export function taiyiModeStop(
  workspaceDir: string,
  options?: { slug?: string; force?: boolean },
): { ok: boolean; text: string; result?: unknown } {
  const r = taiyiStopMode(workspaceDir, options, false);
  const text =
    "result" in r && r.result && typeof r.result === "object" && "text" in r.result
      ? String((r.result as { text: string }).text)
      : "text" in r
        ? String(r.text)
        : JSON.stringify(r);
  return { ok: r.ok, text, result: "result" in r ? r.result : undefined };
}

export function taiyiModeList(workspaceDir: string): { ok: boolean; text: string; active: unknown[] } {
  const r = taiyiModes(workspaceDir, false);
  const text = "text" in r ? String(r.text) : "";
  const active = "active" in r ? r.active : [];
  return { ok: r.ok, text, active };
}

export function taiyiProjectRemember(
  workspaceDir: string,
  note?: string,
): { ok: boolean; text: string; memory?: unknown } {
  const r = taiyiRemember(workspaceDir, note, false);
  const text = "text" in r ? String(r.text) : JSON.stringify(r);
  return { ok: r.ok, text, memory: "memory" in r ? r.memory : undefined };
}

export function taiyiDetectKeyword(
  workspaceDir: string,
  prompt: string,
): { ok: boolean; text: string; detected?: unknown } {
  const r = taiyiKeyword(workspaceDir, prompt, false);
  if (!r.ok) {
    return { ok: false, text: "text" in r ? String(r.text) : "no keyword" };
  }
  return {
    ok: true,
    text: "text" in r ? String(r.text) : "",
    detected: "detected" in r ? r.detected : undefined,
  };
}

export function taiyiRunWorkflow(
  workspaceDir: string,
  skill: string,
  slug?: string,
): { ok: boolean; text: string; result?: unknown; step?: unknown } {
  const r = taiyiWorkflowSkill(workspaceDir, skill, slug, false);
  if (!r.ok) {
    return { ok: false, text: "error" in r ? String(r.error) : JSON.stringify(r) };
  }
  const text =
    "text" in r
      ? String(r.text)
      : "result" in r && r.result && typeof r.result === "object" && "text" in r.result
        ? String((r.result as { text: string }).text)
        : JSON.stringify(r);
  return {
    ok: r.ok,
    text,
    result: "result" in r ? r.result : undefined,
    step: "step" in r ? r.step : undefined,
  };
}

/** MCP slim — 对齐 `doctor --json --compact` */
export function taiyiDoctorCompact(
  workspaceDir: string,
  options?: { strictWorkspace?: boolean },
): DoctorJsonCompact {
  const pkgRoot = resolvePackageRoot(import.meta.url);
  const r = taiyiDoctor(pkgRoot, workspaceDir, options);
  return buildDoctorJsonCompact(r);
}

/** MCP slim — 对齐 `audit --json --compact` */
export function taiyiAuditCompact(workspaceDir: string, slug?: string): AuditJsonCompact {
  const r = taiyiAudit(workspaceDir, { slug, plain: false });
  return buildAuditJsonCompact(r.report);
}

/** MCP slim — provider sync */
export function taiyiSyncProvidersCompact(
  workspaceDir: string,
  targets?: string[],
): { ok: boolean; detail: string; error?: string } {
  const r = taiyiSyncProviders(workspaceDir, targets as InstallTarget[] | undefined);
  if (!r.ok) return { ok: false, detail: r.error ?? "sync failed", error: r.error };
  return { ok: true, detail: r.detail };
}
