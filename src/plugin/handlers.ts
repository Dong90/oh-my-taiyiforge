import fs from "node:fs";
import path from "node:path";
import type { ChangeProfile, GateInput, PhaseId, QualityScores } from "../core/types.js";
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases, getPhase, tryGetPhase } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolveTemplatesDir } from "../core/package-root.js";
import { resolveHumanForComplete } from "../core/gates/human-gate-config.js";
import { resolveActiveSlug, slugifyTitle } from "../core/active-slug.js";
import { resolveAutoHarness } from "../core/resolve-auto-harness.js";
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
import { formatReviewLoopOutput, runReviewMachineCheck } from "../core/review-loop-runner.js";
import { slugValidationError, validateSlug } from "../core/slug.js";
import type { ComplexitySignals } from "../core/routing/complexity.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { getOpenspecStatus, runOpenspecArchive } from "../integrations/openspec.js";
import { syncTaiyiToOpenspec } from "../integrations/openspec-sync.js";
import { runDoctor } from "../core/doctor.js";
import { runDoctorWorkspace } from "../core/doctor-workspace.js";
import { listChanges } from "../core/list-changes.js";
import { formatGuidePlain, formatPhaseProgressLine } from "../core/format-guide.js";
import { buildEngineTruth } from "../core/engine-truth.js";
import { writeHandoff, handoffExists } from "../core/handoff.js";
import {
  evaluateCommitTrailers,
  suggestCommitMessage,
} from "../core/gates/commit-trailer.js";
import { scanArtifactTokens } from "../core/token/scan-artifacts.js";
import { loadTokenBudgetConfig } from "../core/token/budget-config.js";
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
import { auditWorkspace, formatAuditPlain } from "../core/workflow-audit.js";
import { formatAgentHealthProtocol } from "../core/health-invoke.js";
import {
  probePlatformCi,
  formatPlatformProbePlain,
  writeCiAgentPrompt,
  type CiPlatformId,
} from "../core/ci-platform.js";
import { runAutopilotGuide } from "../core/autopilot-runner.js";
import { runTeamGuide } from "../core/team-runner.js";
import { runUltraworkGuide } from "../core/ultrawork-runner.js";
import {
  formatAgentRoleProtocol,
  getAgentRole,
  listAgentRoleIds,
} from "../core/agent-roles.js";
import {
  phaseIdFromSlashVerb,
  runPhaseWriteGuide,
  formatWriteCurrentPhasePlain,
  PHASE_SLASH_VERB,
} from "../core/phase-write.js";
import { runBugScenario, runFeatureScenario } from "../core/scenario-shortcuts.js";
import { cancelRuntimeModes, formatCancelModePlain } from "../core/runtime/cancel-mode.js";
import {
  formatProjectMemoryPlain,
  rememberFact,
  readProjectMemory,
} from "../core/runtime/project-memory.js";
import {
  formatKeywordHint,
  resolveKeywordActivation,
} from "../core/runtime/keyword-modes.js";
import { activateMode, listActiveModes, type TaiyiModeId } from "../core/runtime/mode-state.js";
import {
  runModeStep,
  formatActiveModesBanner,
  type ModeStepResult,
} from "../core/runtime/mode-orchestrator.js";
import {
  listWorkflowSkills,
  runWorkflowSkill,
  type WorkflowSkillId,
} from "../core/runtime/workflow-skills.js";

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

/** 日常推荐入口 — 对齐 CLI `taiyi new <标题>`（自动 slug；auto 默认关，可传 auto/noAuto 或 TAIYI_AUTO_HARNESS） */
export function taiyiNew(
  workspaceDir: string,
  title: string,
  options?: {
    profile?: ChangeProfile;
    strictDev?: boolean;
    auto?: boolean;
    noAuto?: boolean;
    force?: boolean;
  },
) {
  const trimmed = title.trim();
  if (!trimmed) {
    return { ok: false as const, error: "title is required" };
  }
  const harnessArgs: string[] = [];
  if (options?.auto) harnessArgs.push("--auto");
  if (options?.noAuto) harnessArgs.push("--no-auto");
  const slug = slugifyTitle(trimmed);
  return taiyiInit(workspaceDir, slug, {
    title: trimmed,
    profile: options?.profile,
    strictDev: options?.strictDev,
    autoHarness: resolveAutoHarness(harnessArgs, false),
    force: options?.force,
  });
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
  const changeDir = path.join(taiyiRoot, "changes", slug);
  const engineTruth = buildEngineTruth(state, guide, {
    handoffExists: handoffExists(changeDir),
    taiyiRoot,
  });
  return { ok: true as const, state, guide, openspec, taiyiRoot, engineTruth };
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
        error: "请先完成 integration 阶段再归档（complete integration 或 continue 过关）",
        state,
      };
    }
  }

  let openspec = getOpenspecStatus(workspaceDir, slug);
  if (openspec.detected && !openspec.changeExists) {
    const changeDir = path.join(resolveTaiyiRoot(workspaceDir), "changes", slug);
    const sync = syncTaiyiToOpenspec(workspaceDir, slug, changeDir, { createChangeDir: true });
    if (!sync.ok) {
      return {
        ok: false as const,
        error: `归档前自动 sync-openspec 失败: ${sync.reason ?? "unknown"}`,
        openspec,
        state,
      };
    }
    openspec = getOpenspecStatus(workspaceDir, slug);
  }

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

export function taiyiDoctor(
  pkgRoot?: string,
  workspaceDir?: string,
  options?: { strictWorkspace?: boolean },
) {
  const root = pkgRoot ?? resolvePackageRoot(import.meta.url);
  const report = runDoctor(root);
  if (workspaceDir) {
    const taiyiRoot = resolveTaiyiRoot(workspaceDir);
    const workspaceChecks = runDoctorWorkspace(workspaceDir, taiyiRoot, import.meta.url);
    report.workspaceChecks = workspaceChecks;
    report.workspaceOk = workspaceChecks.every((c) => c.ok);
  }
  const installOk = report.ok;
  const workspaceOk = report.workspaceOk !== false;
  const ok = installOk && (options?.strictWorkspace ? workspaceOk : true);
  return { ok, report };
}

export function taiyiCancel(
  workspaceDir: string,
  slug?: string,
): { ok: true; slug: string; workflowStatus: "aborted" } | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const engine = createEngine(workspaceDir);
  const result = engine.abortChange(resolved.slug);
  if (!result.ok) return { ok: false, error: result.error ?? "abort failed" };
  return { ok: true, slug: resolved.slug, workflowStatus: "aborted" };
}

export function taiyiCommitTrailers(
  workspaceDir: string,
  slug?: string,
  subject?: string,
):
  | {
      ok: true;
      slug: string;
      phase: string;
      suggestion: string;
      check: ReturnType<typeof evaluateCommitTrailers>;
    }
  | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const engine = createEngine(workspaceDir);
  const stateResult = requireChangeState(engine, resolved.slug);
  if (!stateResult.ok) return stateResult;
  const phase = stateResult.state.currentPhase;
  const suggestion = suggestCommitMessage(
    resolved.slug,
    phase,
    subject?.trim() || "feat: deliver change slice",
  );
  const check = evaluateCommitTrailers(workspaceDir, resolved.slug, phase);
  return { ok: true, slug: resolved.slug, phase, suggestion, check };
}

export function taiyiHandoff(
  workspaceDir: string,
  slug?: string,
  note?: string,
): { ok: true; slug: string; path: string; engineTruth: ReturnType<typeof buildEngineTruth> } | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const engine = createEngine(workspaceDir);
  const stateResult = requireChangeState(engine, resolved.slug);
  if (!stateResult.ok) return stateResult;
  const state = stateResult.state;
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
    message: `已打卡 ${key}（登记步骤；不验证是否已执行 hook）。可继续主流程或 complete`,
  };
}

export function taiyiAudit(
  workspaceDir: string,
  options?: { slug?: string; plain?: boolean },
) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const report = auditWorkspace(workspaceDir, taiyiRoot, { slug: options?.slug });
  if (options?.plain !== false) {
    return { ok: report.ok, text: formatAuditPlain(report), report };
  }
  return { ok: report.ok, report };
}

export function taiyiHealth(workspaceDir: string, slug?: string) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  let resolved = slug?.trim();
  if (!resolved) {
    const inferred = resolveActiveSlug(taiyiRoot);
    if (!inferred.ok) return { ok: false as const, error: inferred.error };
    resolved = inferred.slug;
  }
  const invalid = rejectInvalidSlug(resolved);
  if (invalid) return invalid;

  const changeDir = path.join(taiyiRoot, "changes", resolved);
  const engine = createEngine(workspaceDir);
  const state = engine.getState(resolved);
  if (!state) return { ok: false as const, error: `Change not found: ${resolved}` };

  const reportPath = path.join(changeDir, "health-report.md");
  const text = formatAgentHealthProtocol(workspaceDir, resolved, reportPath);
  return {
    ok: true as const,
    slug: resolved,
    reportPath,
    hasReport: fs.existsSync(reportPath),
    marked: state.auxiliaryCompleted.includes("taiyi-health"),
    text,
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
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const results = runPostCompleteShellHooks(workspaceDir, taiyiRoot, slug, state.currentPhase);
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

export function taiyiReviewCheck(workspaceDir: string, slug: string, plain = true) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const result = runReviewMachineCheck(engine, slug, { bumpRound: false, workspaceDir });
  if (plain) {
    return { ok: result.ok, text: result.text, result };
  }
  return { ok: result.ok, result };
}

export function taiyiReviewLoop(workspaceDir: string, slug: string, plain = true) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const result = runReviewMachineCheck(engine, slug, { bumpRound: true, workspaceDir });
  const text = formatReviewLoopOutput(result);
  if (plain) {
    return { ok: result.ok, text, result };
  }
  return { ok: result.ok, result: { ...result, text } };
}

export function taiyiRalph(workspaceDir: string, slug: string, plain = true) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  activateMode(taiyiRoot, "ralph", slug, { linkedModes: ["ultrawork"] });
  const step = runModeStep(engine, workspaceDir, taiyiRoot, slug, "ralph");
  const text = step.text;
  if (plain) {
    return { ok: step.ok, text, result: step };
  }
  return { ok: step.ok, result: step };
}

export function taiyiAutopilot(workspaceDir: string, slug: string, plain = true) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const guide = runAutopilotGuide(engine, workspaceDir, taiyiRoot, slug);
  const step = runModeStep(engine, workspaceDir, taiyiRoot, slug, "autopilot");
  const text = [guide.text, "", "── 本步 ──", step.text].join("\n");
  // autopilot 命令 = 激活模式 + 指引；人工门/harness 阻塞由 step 子命令报告，不算 autopilot 失败
  if (plain) {
    return { ok: guide.ok, text, guide, step };
  }
  return { ok: guide.ok, guide, step };
}

export function taiyiTeam(workspaceDir: string, slug: string, plain = true) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const result = runTeamGuide(engine, slug, taiyiRoot);
  if (plain) {
    return { ok: result.ok, text: result.text, result };
  }
  return { ok: result.ok, result };
}

export function taiyiUltrawork(workspaceDir: string, slug: string, plain = true) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const result = runUltraworkGuide(engine, slug, taiyiRoot);
  if (plain) {
    return { ok: result.ok, text: result.text, result };
  }
  return { ok: result.ok, result };
}

export function taiyiAgent(
  workspaceDir: string,
  roleId: string,
  slug?: string,
  plain = true,
) {
  if (roleId === "list" || roleId === "--list") {
    const text = [
      "Taiyi 专 Agent 角色（原生 · 自 OMC 能力迁移）:",
      ...listAgentRoleIds().map((id) => `  · ${id}`),
      "",
      "用法: /taiyi:agent <role> [slug]",
    ].join("\n");
    return { ok: true as const, text };
  }

  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return resolved;

  const invalid = rejectInvalidSlug(resolved.slug);
  if (invalid) return invalid;

  const engine = createEngine(workspaceDir);
  const state = engine.getState(resolved.slug);
  if (!state) {
    return { ok: false as const, error: `Change not found: ${resolved.slug}` };
  }

  const phase = state.currentPhase as PhaseId;
  const role = getAgentRole(roleId);
  const strictBlocked =
    Boolean(role) &&
    process.env.TAIYI_AGENT_STRICT_PHASE === "1" &&
    !role!.phases.includes(phase);
  const text = formatAgentRoleProtocol(roleId, resolved.slug, phase);
  if (plain) {
    return { ok: Boolean(role) && !strictBlocked, text };
  }
  return { ok: Boolean(role) && !strictBlocked, role: role?.id, phase, slug: resolved.slug, text };
}

export function taiyiWrite(workspaceDir: string, slug?: string, plain = true) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return resolved;
  const invalid = rejectInvalidSlug(resolved.slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const text = formatWriteCurrentPhasePlain(engine, workspaceDir, resolved.slug);
  const state = engine.getState(resolved.slug);
  const ok = Boolean(state);
  if (plain) return { ok, text, slug: resolved.slug, phase: state?.currentPhase };
  return { ok, slug: resolved.slug, phase: state?.currentPhase, text };
}

export function taiyiPhaseWrite(
  workspaceDir: string,
  phaseVerb: string,
  slug?: string,
  plain = true,
) {
  const phaseId = phaseIdFromSlashVerb(phaseVerb);
  if (!phaseId) {
    return {
      ok: false as const,
      error: `未知阶段: ${phaseVerb}。可用: ${Object.values(PHASE_SLASH_VERB).join(", ")}`,
    };
  }
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return resolved;
  const invalid = rejectInvalidSlug(resolved.slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const result = runPhaseWriteGuide(engine, workspaceDir, taiyiRoot, resolved.slug, phaseId);
  if (plain) return { ok: result.ok, text: result.text, result };
  return { ok: result.ok, result };
}

export function taiyiFeature(workspaceDir: string, args?: string, plain = true) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const engine = createEngine(workspaceDir);
  const result = runFeatureScenario(engine, taiyiRoot, args?.trim());
  if (plain) return { ok: result.ok, text: result.text, result };
  return { ok: result.ok, result };
}

export function taiyiBug(workspaceDir: string, args?: string, plain = true) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const engine = createEngine(workspaceDir);
  const result = runBugScenario(engine, taiyiRoot, args?.trim());
  if (plain) return { ok: result.ok, text: result.text, result };
  return { ok: result.ok, result };
}

export function taiyiStopMode(
  workspaceDir: string,
  options?: { force?: boolean; slug?: string },
  plain = true,
) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const result = cancelRuntimeModes(taiyiRoot, options);
  const text = formatCancelModePlain(result);
  if (plain) return { ok: result.ok, text, result };
  return { ok: result.ok, result: { ...result, text } };
}

export function taiyiModes(workspaceDir: string, plain = true) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const active = listActiveModes(taiyiRoot);
  const lines = ["══ Taiyi 运行时模式 ══"];
  if (active.length === 0) {
    lines.push("  （无活跃模式）");
  } else {
    for (const a of active) {
      lines.push(`  · ${a.mode} → ${a.slug ?? "?"}`);
    }
  }
  lines.push("", "停止: /taiyi:stop-mode [--force]");
  const text = lines.join("\n");
  if (plain) return { ok: true, text, active };
  return { ok: true, active, text };
}

export function taiyiRemember(workspaceDir: string, note?: string, plain = true) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  try {
    if (note?.trim()) {
      rememberFact(taiyiRoot, { category: "note", text: note.trim(), source: "hand" });
    }
    const text = formatProjectMemoryPlain(taiyiRoot);
    const memory = readProjectMemory(taiyiRoot);
    if (plain) return { ok: true as const, text, memory };
    return { ok: true as const, memory, text };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const text = `remember 失败: ${error}`;
    if (plain) return { ok: false as const, text, error };
    return { ok: false as const, error, text };
  }
}

export function taiyiKeyword(workspaceDir: string, prompt: string, plain = true) {
  const detected = resolveKeywordActivation(prompt);
  if (!detected) {
    const text = "未检测到 OMC 兼容关键词。可用: ralph, autopilot, ultrawork, ralplan, ultraqa, stopomc";
    return { ok: false, text };
  }
  const text = formatKeywordHint(detected);
  if (plain) return { ok: true, text, detected };
  return { ok: true, detected, text };
}

export function taiyiWorkflowSkill(
  workspaceDir: string,
  skill: string,
  slug?: string,
  plain = true,
) {
  const skillId = skill.toLowerCase() as WorkflowSkillId;
  if (!listWorkflowSkills().includes(skillId)) {
    return {
      ok: false as const,
      error: `未知 workflow skill: ${skill}。可用: ${listWorkflowSkills().join(", ")}`,
    };
  }
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return resolved;
  const invalid = rejectInvalidSlug(resolved.slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const result = runWorkflowSkill(engine, taiyiRoot, skillId, resolved.slug);
  const modeMap: Partial<Record<WorkflowSkillId, TaiyiModeId>> = {
    ralplan: "ralplan",
    plan: "plan",
    ultraqa: "ultraqa",
    ecomode: "ecomode",
    "deep-interview": "deep-interview",
    "visual-verdict": "visual-verdict",
    "ai-slop-cleaner": "ai-slop-cleaner",
  };
  const mode = modeMap[skillId];
  if (mode) {
    const step = runModeStep(engine, workspaceDir, taiyiRoot, resolved.slug, mode);
    const text = [result.text, "", "── step ──", step.text].join("\n");
    if (plain) return { ok: result.ok && step.ok, text, result, step };
    return { ok: result.ok && step.ok, result, step };
  }
  if (plain) return { ok: result.ok, text: result.text, result };
  return { ok: result.ok, result };
}

export function taiyiStep(
  workspaceDir: string,
  slug?: string,
  options?: { mode?: string },
  plain = true,
) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return resolved;
  const invalid = rejectInvalidSlug(resolved.slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const mode = options?.mode?.trim() as TaiyiModeId | undefined;
  const step = runModeStep(engine, workspaceDir, taiyiRoot, resolved.slug, mode);
  const banner = formatActiveModesBanner(taiyiRoot);
  const text = banner ? `[${banner}]\n\n${step.text}` : step.text;
  if (plain) return { ok: step.ok, text, step };
  return { ok: step.ok, step: { ...step, text } };
}
