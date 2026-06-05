import path from "node:path";
import type { ChangeProfile, GateInput, PhaseId, QualityScores } from "../core/types.js";
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases, getPhase } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolveTemplatesDir } from "../core/package-root.js";
import { isAutoApprover, requiresHumanGate } from "../core/gates/human-gate-config.js";
import { slugValidationError, validateSlug } from "../core/slug.js";
import type { ComplexitySignals } from "../core/routing/complexity.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { getOpenspecStatus, runOpenspecArchive } from "../integrations/openspec.js";
import { syncTaiyiToOpenspec } from "../integrations/openspec-sync.js";
import { runDoctor } from "../core/doctor.js";
import { listChanges } from "../core/list-changes.js";
import { formatGuidePlain } from "../core/format-guide.js";
import { resolvePackageRoot } from "../core/package-root.js";
import { formatWalkthroughPlain, runWalkthrough } from "../core/walkthrough.js";
import {
  buildHarnessPlan,
  formatHarnessPlanPlain,
  runPostCompleteShellHooks,
} from "../core/harness-runner.js";
import { markHarnessCheckpoint, hookKey } from "../core/harness-checkpoints.js";
import { getHarnessContext } from "../integrations/harness-hooks.js";
import {
  verifyWorkspaceCi,
  formatCiVerifyPlain,
} from "../core/ci-verify.js";
import {
  probePlatformCi,
  formatPlatformProbePlain,
  writeCiAgentPrompt,
  type CiPlatformId,
} from "../core/ci-platform.js";

const TEMPLATES_DIR = resolveTemplatesDir(import.meta.url);

function rejectInvalidSlug(slug: string): { ok: false; error: string } | null {
  const error = slugValidationError(slug);
  return error ? { ok: false as const, error } : null;
}

export function createEngine(workspaceDir: string): WorkflowEngine {
  return new WorkflowEngine(resolveTaiyiRoot(workspaceDir), TEMPLATES_DIR);
}

export function taiyiInit(
  workspaceDir: string,
  slug: string,
  options?: {
    title?: string;
    profile?: ChangeProfile;
    strictDev?: boolean;
    autoHarness?: boolean;
  },
) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;

  const engine = createEngine(workspaceDir);
  try {
    const result = engine.initChange(slug, {
      title: options?.title,
      templatesDir: TEMPLATES_DIR,
      profile: options?.profile,
      strictDev: options?.strictDev,
      autoHarness: options?.autoHarness,
    });
    const { seeded, ...state } = result;
    return {
      ok: true as const,
      state,
      seeded,
      assessment: state.complexity,
      taiyiRoot: resolveTaiyiRoot(workspaceDir),
    };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export function taiyiStatus(workspaceDir: string, slug: string) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  const openspec = getOpenspecStatus(workspaceDir, slug);
  return { ok: true as const, state, guide, openspec, taiyiRoot };
}

export function taiyiGuide(workspaceDir: string, slug: string) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
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
  const slugCheck = validateSlug(slug);
  if (!slugCheck.ok) return { ok: false as const, error: slugCheck.error };

  const engine = createEngine(workspaceDir);
  const phase = getPhase(phaseId as PhaseId);
  const quality: QualityScores = {
    completeness: gates?.quality?.completeness ?? true,
    consistency: gates?.quality?.consistency ?? true,
    verifiability: gates?.quality?.verifiability ?? true,
    traceability: gates?.quality?.traceability ?? true,
    engineering_quality: gates?.quality?.engineering_quality ?? true,
  };

  const needsHuman = requiresHumanGate(phase.id);
  const requestedApprover = gates?.human?.approver?.trim();
  if (needsHuman && !requestedApprover) {
    return {
      ok: false as const,
      error: `Human gate required for phase ${phase.id}: provide gates.human.approver`,
    };
  }
  if (needsHuman && requestedApprover && isAutoApprover(requestedApprover)) {
    return {
      ok: false as const,
      error: `Human gate required for phase ${phase.id}: automated approver ${requestedApprover} not allowed`,
    };
  }

  const human = gates?.human ?? {
    approved: true,
    approver: needsHuman ? "opencode-user" : "opencode-agent",
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
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
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
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
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
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
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
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  try {
    const { signals: used, assessment } = engine.assessComplexity(slug, signals);
    return { ok: true as const, signals: used, assessment };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}

export function taiyiWalkthrough(
  workspaceDir: string,
  options?: { slug?: string; profile?: ChangeProfile; title?: string; plain?: boolean },
) {
  if (options?.slug) {
    const invalid = rejectInvalidSlug(options.slug);
    if (invalid) return invalid;
  }
  const result = runWalkthrough(workspaceDir, {
    slug: options?.slug,
    profile: options?.profile,
    title: options?.title,
  });
  if (options?.plain !== false) {
    return { ok: result.ok, text: formatWalkthroughPlain(result), result };
  }
  return { ok: result.ok, result };
}

export function taiyiHarness(workspaceDir: string, slug: string, plain = true) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const plan = buildHarnessPlan(workspaceDir, taiyiRoot, state);
  if (plain) {
    return { ok: true as const, text: formatHarnessPlanPlain(plan), plan, state };
  }
  return { ok: true as const, plan, state };
}

export function taiyiHarnessCheck(workspaceDir: string, slug: string, hookRef: string) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };
  const changeDir = path.join(resolveTaiyiRoot(workspaceDir), "changes", slug);
  const harness = getHarnessContext(workspaceDir, slug, state.currentPhase);
  const match = harness.hooks.find((h) => hookKey(h) === hookRef || h.skill === hookRef);
  const key = match ? hookKey(match) : hookRef;
  markHarnessCheckpoint(changeDir, state.currentPhase, key);
  return {
    ok: true as const,
    phase: state.currentPhase,
    key,
    message: `已打卡 ${key}，可继续主流程或 complete`,
  };
}

export function taiyiCiVerify(
  workspaceDir: string,
  options?: { slug?: string; requireComplete?: boolean; plain?: boolean },
) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const report = verifyWorkspaceCi(workspaceDir, taiyiRoot, {
    slug: options?.slug,
    requireComplete: options?.requireComplete,
  });
  if (options?.plain !== false) {
    return { ok: report.ok, text: formatCiVerifyPlain(report), report };
  }
  return { ok: report.ok, report };
}

export function taiyiCiPlatform(pkgRoot: string, platform: CiPlatformId, plain = true) {
  const probe = probePlatformCi(pkgRoot, platform);
  if (plain) {
    return { ok: probe.ok, text: formatPlatformProbePlain(probe), probe };
  }
  return { ok: probe.ok, probe };
}

export function taiyiCiPrompt(workspaceDir: string, slug: string) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };
  const file = writeCiAgentPrompt(workspaceDir, resolveTaiyiRoot(workspaceDir), state);
  return { ok: true as const, promptFile: file, phase: state.currentPhase };
}

export function taiyiHarnessRunShell(workspaceDir: string, slug: string) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: `Change not found: ${slug}` };
  const results = runPostCompleteShellHooks(workspaceDir, slug, state.currentPhase);
  return { ok: true as const, results, phase: state.currentPhase };
}
