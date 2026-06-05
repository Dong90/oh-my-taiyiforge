import path from "node:path";
import type { ChangeProfile, GateInput, PhaseId, QualityScores } from "../core/types.js";
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases, getPhase, tryGetPhase } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolveTemplatesDir } from "../core/package-root.js";
import { resolveHumanForComplete } from "../core/gates/human-gate-config.js";
import { resolveActiveSlug } from "../core/active-slug.js";
import { isWorkflowCompleted } from "../core/change-status.js";
import {
  formatAgentLoopProtocol,
  formatLoopResultPlain,
  runContinueRepeat,
  runLoopUntilComplete,
} from "../core/loop-runner.js";
import {
  tokenCompress,
  tokenRecord,
  tokenScan,
  tokenStatusPlain,
} from "../core/token-runner.js";
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

function requireChangeState(
  engine: WorkflowEngine,
  slug: string,
): { ok: true; state: import("../core/types.js").ChangeState } | { ok: false; error: string } {
  const lookup = engine.lookupState(slug);
  if (lookup.status === "corrupt") {
    return { ok: false, error: `Corrupt state.json for ${slug}: ${lookup.error}` };
  }
  if (lookup.status === "missing") {
    return { ok: false, error: `Change not found: ${slug}` };
  }
  return { ok: true, state: lookup.state };
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
    force?: boolean;
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
      force: options?.force,
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
  const stateResult = requireChangeState(engine, slug);
  if (!stateResult.ok) return stateResult;
  const state = stateResult.state;
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
  const openspec = getOpenspecStatus(workspaceDir, slug);
  return { ok: true as const, state, guide, openspec, taiyiRoot };
}

export function taiyiGuide(workspaceDir: string, slug: string) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const stateResult = requireChangeState(engine, slug);
  if (!stateResult.ok) return stateResult;
  const state = stateResult.state;
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

  const phase = tryGetPhase(phaseId);
  if (!phase) {
    return { ok: false as const, error: `Unknown phase: ${phaseId}` };
  }

  const engine = createEngine(workspaceDir);
  const quality: QualityScores = {
    completeness: gates?.quality?.completeness ?? true,
    consistency: gates?.quality?.consistency ?? true,
    verifiability: gates?.quality?.verifiability ?? true,
    traceability: gates?.quality?.traceability ?? true,
    engineering_quality: gates?.quality?.engineering_quality ?? true,
  };

  const humanResolved = resolveHumanForComplete(phase.id, gates?.human?.approver);
  if (!humanResolved.ok) return humanResolved;

  const result = engine.completePhase(slug, phase.id, { quality, human: humanResolved.human }, {
    allowAutoHuman: humanResolved.allowAutoHuman,
  });
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
  if (!match) {
    return {
      ok: false as const,
      error: `Unknown harness hook: ${hookRef}`,
    };
  }
  const key = hookKey(match);
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

export function taiyiContinue(
  workspaceDir: string,
  slug: string,
  options?: { approver?: string; times?: number; plain?: boolean },
) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const stateResult = requireChangeState(engine, slug);
  if (!stateResult.ok) return stateResult;
  const state = stateResult.state;

  if (isWorkflowCompleted(state)) {
    return { ok: true as const, completed: true as const, message: "九阶段已全部完成" };
  }

  const times = options?.times ?? 1;
  if (times > 1) {
    const result = runContinueRepeat(engine, workspaceDir, taiyiRoot, slug, times);
    if (options?.plain !== false) {
      return {
        ok: result.ok,
        text: formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir),
        result,
      };
    }
    return { ok: result.ok, result };
  }

  const phaseId = state.currentPhase;
  const humanResolved = resolveHumanForComplete(phaseId, options?.approver);
  if (!humanResolved.ok) return humanResolved;

  const complete = engine.completePhase(
    slug,
    phaseId,
    {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: humanResolved.human,
    },
    { allowAutoHuman: humanResolved.allowAutoHuman },
  );

  if (!complete.ok) {
    const guide = buildPhaseGuide(taiyiRoot, slug, state, workspaceDir);
    return {
      ok: false as const,
      error: complete.error,
      text: options?.plain !== false ? formatGuidePlain(guide) : undefined,
      guide,
    };
  }

  const nextState = engine.getState(slug)!;
  const guide = buildPhaseGuide(taiyiRoot, slug, nextState, workspaceDir);
  return {
    ok: true as const,
    state: nextState,
    text: options?.plain !== false ? formatGuidePlain(guide) : undefined,
    guide,
  };
}

export function taiyiLoop(
  workspaceDir: string,
  slug: string,
  options?: { times?: number; plain?: boolean },
) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const stateResult = requireChangeState(engine, slug);
  if (!stateResult.ok) return stateResult;

  const result = runLoopUntilComplete(
    engine,
    workspaceDir,
    taiyiRoot,
    slug,
    options?.times,
  );
  if (options?.plain === false) {
    return { ok: result.ok, result };
  }
  const text = formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir);
  const protocol =
    !result.ok
      ? `\n\n${formatAgentLoopProtocol(slug, result.loopRound, result.maxRounds)}`
      : "";
  return { ok: result.ok, text: text + protocol, result };
}

export function taiyiApply(
  workspaceDir: string,
  slug: string,
  options?: { times?: number; plain?: boolean },
) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const stateResult = requireChangeState(engine, slug);
  if (!stateResult.ok) return stateResult;
  const state = stateResult.state;

  if (isWorkflowCompleted(state)) {
    return { ok: true as const, completed: true as const, message: "九阶段已全部完成" };
  }

  const phase = state.currentPhase;
  if (phase !== "dev" && phase !== "test") {
    return {
      ok: false as const,
      error: `当前阶段为「${phase}」。apply 用于 dev/test 实现与验证`,
    };
  }

  const harness = taiyiHarness(workspaceDir, slug, options?.plain !== false);
  const times = options?.times ?? 1;
  return { ...harness, phase, times };
}

export function taiyiToken(
  workspaceDir: string,
  sub: "status" | "record" | "scan" | "compress",
  options?: {
    slug?: string;
    tokens?: number;
    phase?: PhaseId;
    kind?: "agent" | "artifact" | "scan";
    label?: string;
  },
) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const slugResult = options?.slug?.trim()
    ? { ok: true as const, slug: options.slug.trim(), inferred: false }
    : resolveActiveSlug(taiyiRoot);
  if (!slugResult.ok) return slugResult;

  const slug = slugResult.slug;
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;

  const engine = createEngine(workspaceDir);
  const stateResult = requireChangeState(engine, slug);
  const state = stateResult.ok ? stateResult.state : null;
  const changeDir = path.join(taiyiRoot, "changes", slug);
  const phase = (options?.phase ?? state?.currentPhase ?? "change") as PhaseId;

  if (sub === "status") {
    return { ok: true as const, text: tokenStatusPlain(changeDir, slug, state?.currentPhase) };
  }
  if (sub === "record") {
    const n = options?.tokens;
    if (n == null || !Number.isFinite(n) || n < 0) {
      return { ok: false as const, error: "token record requires non-negative tokens number" };
    }
    return {
      ok: true as const,
      text: tokenRecord(changeDir, slug, n, {
        phase,
        kind: options?.kind ?? "agent",
        label: options?.label,
      }),
    };
  }
  if (sub === "scan") {
    return { ok: true as const, text: tokenScan(changeDir, slug, phase) };
  }
  return { ok: true as const, text: tokenCompress(changeDir, slug, phase) };
}
