import path from "node:path";
import type { ChangeProfile, GateInput, PhaseId, QualityScores } from "../core/types.js";
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases, getPhase } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolveTemplatesDir } from "../core/package-root.js";
import { requiresHumanGate } from "../core/gates/human-gate-config.js";
import type { ComplexitySignals } from "../core/routing/complexity.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { getOpenspecStatus, runOpenspecArchive } from "../integrations/openspec.js";
import { syncTaiyiToOpenspec } from "../integrations/openspec-sync.js";
import { runDoctor } from "../core/doctor.js";
import { listChanges } from "../core/list-changes.js";
import { formatGuidePlain } from "../core/format-guide.js";
import { resolvePackageRoot } from "../core/package-root.js";

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url);

export function createEngine(workspaceDir: string): WorkflowEngine {
  return new WorkflowEngine(resolveTaiyiRoot(workspaceDir), TEMPLATES_DIR);
}

export function taiyiInit(
  workspaceDir: string,
  slug: string,
  options?: { title?: string; profile?: ChangeProfile; strictDev?: boolean },
) {
  const engine = createEngine(workspaceDir);
  const result = engine.initChange(slug, {
    title: options?.title,
    templatesDir: TEMPLATES_DIR,
    profile: options?.profile,
    strictDev: options?.strictDev,
  });
  const { seeded, ...state } = result;
  return {
    ok: true as const,
    state,
    seeded,
    assessment: state.complexity,
    taiyiRoot: resolveTaiyiRoot(workspaceDir),
  };
}

export function taiyiStatus(workspaceDir: string, slug: string) {
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  const openspec = getOpenspecStatus(workspaceDir, slug);
  return { ok: true as const, state, guide, openspec, taiyiRoot };
}

export function taiyiGuide(workspaceDir: string, slug: string) {
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };
  const guide = buildPhaseGuide(resolveTaiyiRoot(workspaceDir), slug, state, workspaceDir);
  return { ok: true as const, guide, assessment: state.complexity };
}

export function taiyiPhases() {
  return listPhases().map((p) => ({
    id: p.id,
    order: p.order,
    skill: p.skill,
    artifact: p.artifact,
    requires: p.requires,
  }));
}

export function taiyiComplete(
  workspaceDir: string,
  slug: string,
  phaseId: string,
  gates?: Partial<GateInput>,
) {
  const engine = createEngine(workspaceDir);
  const phase = getPhase(phaseId as PhaseId);
  const quality: QualityScores = {
    completeness: gates?.quality?.completeness ?? true,
    consistency: gates?.quality?.consistency ?? true,
    verifiability: gates?.quality?.verifiability ?? true,
    traceability: gates?.quality?.traceability ?? true,
    engineering_quality: gates?.quality?.engineering_quality ?? true,
  };
  const human = gates?.human ?? {
    approved: true,
    approver: requiresHumanGate(phase.id) ? "opencode-user" : "opencode-agent",
  };
  const result = engine.completePhase(slug, phase.id, { quality, human });
  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error,
      qualityHints: result.qualityHints,
    };
  }
  const nextState = engine.getState(slug)!;
  return {
    ok: true as const,
    state: nextState,
    phase: phase.id,
    nextSkill: getPhase(nextState.currentPhase).skill,
    assessment: nextState.complexity,
  };
}

export function taiyiMarkAux(workspaceDir: string, slug: string, skillId: string) {
  const engine = createEngine(workspaceDir);
  const result = engine.markAuxiliary(slug, skillId);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, state: engine.getState(slug) };
}

export function taiyiSyncOpenspec(
  workspaceDir: string,
  slug: string,
  options?: { force?: boolean; createChangeDir?: boolean },
) {
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };

  const changeDir = path.join(resolveTaiyiRoot(workspaceDir), "changes", slug);
  const result = syncTaiyiToOpenspec(workspaceDir, slug, changeDir, {
    force: options?.force,
    createChangeDir: options?.createChangeDir ?? true,
  });

  return { ...result, state };
}

export function taiyiArchive(
  workspaceDir: string,
  slug: string,
  options?: { skipSpecs?: boolean; requireIntegrationComplete?: boolean },
) {
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };

  if (options?.requireIntegrationComplete !== false) {
    if (!state.completedPhases.includes("integration")) {
      return {
        ok: false as const,
        error: "Complete taiyi integration phase before OpenSpec archive",
        state,
      };
    }
  }

  const openspec = getOpenspecStatus(workspaceDir, slug);
  const result = runOpenspecArchive(workspaceDir, slug, {
    skipSpecs: options?.skipSpecs,
    yes: true,
  });

  if (result.skipped && result.ok) {
    return { ok: true as const, skipped: true as const, reason: result.reason, openspec, state };
  }
  if (!result.ok) {
    return {
      ok: false as const,
      error: result.reason ?? "openspec archive failed",
      openspec,
      stdout: result.stdout,
      stderr: result.stderr,
      state,
    };
  }

  return {
    ok: true as const,
    openspec,
    stdout: result.stdout,
    state,
  };
}

export function taiyiDoctor(pkgRoot?: string) {
  const root = pkgRoot ?? resolvePackageRoot(import.meta.url);
  const report = runDoctor(root);
  return { ok: report.ok, report };
}

export function taiyiList(workspaceDir: string) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const changes = listChanges(taiyiRoot);
  return { ok: true as const, changes, taiyiRoot };
}

export function taiyiNext(workspaceDir: string, slug: string, plain = true) {
  const r = taiyiGuide(workspaceDir, slug);
  if (!r.ok) return r;
  if (plain) {
    return { ok: true as const, text: formatGuidePlain(r.guide), guide: r.guide };
  }
  return { ok: true as const, guide: r.guide, assessment: r.assessment };
}

export function taiyiAssess(workspaceDir: string, slug: string, signals?: ComplexitySignals) {
  const engine = createEngine(workspaceDir);
  try {
    const { signals: used, assessment } = engine.assessComplexity(slug, signals);
    return { ok: true as const, signals: used, assessment };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}
