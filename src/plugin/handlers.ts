import fs from "node:fs";
import path from "node:path";
import type { ChangeProfile, GateInput, PhaseId, QualityScores } from "../core/types.js";
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases, getPhase, tryGetPhase } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolveTemplatesDir } from "../core/package-root.js";
import { resolveHumanForComplete } from "../core/gates/human-gate-config.js";
import { resolveActiveSlug, resolveChangeSlug, slugifyTitle } from "../core/active-slug.js";
import { resolveAutoHarness } from "../core/resolve-auto-harness.js";
import { isWorkflowCompleted, completedWorkflowMessage, loadChangeState } from "../core/change-status.js";
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
import {
  archiveTaiyiChange,
  findExistingArchiveDirForSlug,
  formatTaiyiArchivePlain,
  isTaiyiArchived,
  resolveChangeDir,
  taiyiArchiveWhenOpenspecAlreadyDone,
} from "../core/taiyi-archive.js";
import { runDoctor } from "../core/doctor.js";
import { runDoctorWorkspace } from "../core/doctor-workspace.js";
import { listChanges, type ListChangesOptions } from "../core/list-changes.js";
import { formatGuidePlain, formatPhaseProgressLine } from "../core/format-guide.js";
import { buildEngineTruth } from "../core/engine-truth.js";
import { writeHandoff, handoffExists, handoffPath } from "../core/handoff.js";
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
import {
  formatChangeNotFound,
  formatUnknownHarnessHook,
  formatUnknownWorkflowSkill,
} from "../core/cli-hints.js";
import { markHarnessCheckpoint, hookKey } from "../core/harness-checkpoints.js";
import { trimAheadArtifacts, formatTrimAheadPlain } from "../core/trim-ahead-artifacts.js";
import { pruneOrphanChangeDirs, formatPrunePlain } from "../core/prune-changes.js";
import {
  formatOrphanRuntimePlain,
  formatStaleRuntimePlain,
  pruneOrphanRuntimeModes,
  pruneStaleRuntimeModes,
  clearRuntimeForSlug,
} from "../core/runtime/orphan-runtime.js";
import { getHarnessContext } from "../integrations/harness-hooks.js";
import {
  verifyWorkspaceCi,
  formatCiVerifyPlain,
} from "../core/ci-verify.js";
import { auditWorkspace, formatAuditCompact, formatAuditPlain } from "../core/workflow-audit.js";
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
import {
  runBugScenario,
  runFeatureScenario,
  runFlowScenario,
  runScenario,
  type ScenarioId,
} from "../core/scenario-shortcuts.js";
import { resolveDefaultProfile } from "../core/project-config.js";
import { queryMilestone, type MilestoneReport } from "../core/milestone-query.js";
import { formatMilestonePlain } from "../core/milestone-render.js";
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
    return { ok: false, error: formatChangeNotFound(slug) };
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
  const changeDir = engine.changeDir(slug);
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
  if (!state) return { ok: false as const, error: formatChangeNotFound(slug) };

  const changeDir = path.join(resolveTaiyiRoot(workspaceDir), "changes", slug);
  const result = syncTaiyiToOpenspec(workspaceDir, slug, changeDir, {
    force: options?.force,
    createChangeDir: options?.createChangeDir ?? true,
  });

  return { ...result, state };
}

function finalizeTaiyiArchive(
  taiyiRoot: string,
  slug: string,
  opts: {
    openspecWasArchivedBefore: boolean;
    alreadyArchived?: boolean;
    openspecDetected: boolean;
    openspecSkipped?: boolean;
  },
): ReturnType<typeof archiveTaiyiChange> {
  if (opts.openspecWasArchivedBefore || opts.alreadyArchived) {
    return taiyiArchiveWhenOpenspecAlreadyDone(taiyiRoot, slug);
  }
  return archiveTaiyiChange(taiyiRoot, slug, {
    openspec: opts.openspecDetected && !opts.openspecSkipped,
  });
}

export function taiyiArchive(
  workspaceDir: string,
  slug: string,
  options?: { skipSpecs?: boolean; requireIntegrationComplete?: boolean },
) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const state = loadChangeState(taiyiRoot, slug);
  if (!state) return { ok: false as const, error: formatChangeNotFound(slug) };

  if (options?.requireIntegrationComplete !== false) {
    if (!state.completedPhases.includes("integration")) {
      return {
        ok: false as const,
        error: "请先完成 integration 阶段再归档（complete integration 或 continue 过关）",
        state,
      };
    }
  }

  const existingTaiyiArchive = isTaiyiArchived(taiyiRoot, slug);
  const openspecEarly = getOpenspecStatus(workspaceDir, slug);
  const workflowDone = isWorkflowCompleted(state);

  if (existingTaiyiArchive) {
    const dest = findExistingArchiveDirForSlug(taiyiRoot, slug) ?? resolveChangeDir(taiyiRoot, slug)!;
    const text = formatTaiyiArchivePlain(slug, {
      ok: true,
      dest,
      reason: "already in .taiyi/archive (幂等 no-op，跳过重复移动与 OpenSpec archive)",
    });
    return {
      ok: true as const,
      alreadyArchived: true as const,
      skipped: true as const,
      state,
      openspec: openspecEarly,
      taiyiArchive: { ok: true, dest, reason: "already in .taiyi/archive (幂等)" },
      text,
    };
  }

  if (workflowDone && openspecEarly.archivedExists) {
    const dest = openspecEarly.archivedPath ?? resolveChangeDir(taiyiRoot, slug) ?? undefined;
    const text = [
      `✓ 已归档 (${slug})（幂等 no-op）`,
      openspecEarly.archivedPath
        ? `  OpenSpec: ${openspecEarly.archivedPath}`
        : "  OpenSpec 已归档",
      dest && dest.includes(`${path.sep}archive${path.sep}`)
        ? `  Taiyi: ${dest}`
        : "  Taiyi 变更仍在 .taiyi/changes/（verify/status 可用）",
    ].join("\n");
    return {
      ok: true as const,
      alreadyArchived: true as const,
      skipped: true as const,
      state,
      openspec: openspecEarly,
      reason: "workflow 与 OpenSpec 均已归档（幂等 no-op）",
      text,
    };
  }

  let openspec = openspecEarly;
  const openspecWasArchivedBefore = openspec.archivedExists && !openspec.changeExists;
  if (openspec.detected && !openspec.changeExists && !openspec.archivedExists) {
    const changeDir = resolveChangeDir(taiyiRoot, slug) ?? path.join(taiyiRoot, "changes", slug);
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

  const result = openspecWasArchivedBefore
    ? {
        ok: true as const,
        skipped: true as const,
        alreadyArchived: true as const,
        reason: openspec.archivedPath
          ? `OpenSpec 已归档: ${openspec.archivedPath}`
          : "OpenSpec 已归档",
      }
    : runOpenspecArchive(workspaceDir, slug, {
        skipSpecs: options?.skipSpecs,
        yes: true,
      });

  if (result.skipped && result.ok && !result.alreadyArchived) {
    const taiyiArchive = finalizeTaiyiArchive(taiyiRoot, slug, {
      openspecWasArchivedBefore,
      openspecDetected: openspec.detected,
      openspecSkipped: true,
    });
    const text = formatTaiyiArchivePlain(slug, taiyiArchive);
    return {
      ok: taiyiArchive.ok,
      skipped: true as const,
      reason: result.reason,
      openspec,
      state,
      taiyiArchive,
      text,
    };
  }
  if (!result.ok) {
    if (result.alreadyArchived) {
      const taiyiArchiveResult = taiyiArchiveWhenOpenspecAlreadyDone(taiyiRoot, slug);
      const text = [
        `✓ OpenSpec 已归档（幂等）`,
        result.reason ?? "",
        taiyiArchiveResult.reason ?? (taiyiArchiveResult.dest ? `Taiyi: ${taiyiArchiveResult.dest}` : ""),
      ].join("\n");
      return {
        ok: true as const,
        alreadyArchived: true as const,
        skipped: true as const,
        reason: result.reason,
        openspec,
        state,
        taiyiArchive: taiyiArchiveResult,
        text,
      };
    }
    if (state.completedPhases.includes("integration")) {
      const taiyiOnly = archiveTaiyiChange(taiyiRoot, slug, { openspec: false });
      if (taiyiOnly.ok) {
        const text = [
          `✓ Taiyi 归档完成（OpenSpec 未成功，已降级仅 Taiyi 侧）`,
          `  slug: ${slug}`,
          taiyiOnly.dest ? `  path: ${taiyiOnly.dest}` : "",
          `  OpenSpec: ${result.reason ?? "archive failed"}`,
          openspec.detected
            ? "  提示: 可稍后手动 openspec archive 或重试 archive --skip-specs"
            : "",
        ]
          .filter(Boolean)
          .join("\n");
        return {
          ok: true as const,
          skipped: true as const,
          reason: result.reason,
          openspec,
          stdout: result.stdout,
          stderr: result.stderr,
          state,
          taiyiArchive: taiyiOnly,
          text,
        };
      }
    }
    return {
      ok: false as const,
      error: result.reason ?? "openspec archive failed",
      openspec,
      stdout: result.stdout,
      stderr: result.stderr,
      state,
    };
  }

  const taiyiArchiveResult = finalizeTaiyiArchive(taiyiRoot, slug, {
    openspecWasArchivedBefore,
    alreadyArchived: result.alreadyArchived,
    openspecDetected: openspec.detected,
    openspecSkipped: result.skipped,
  });

  const idempotent =
    result.alreadyArchived ||
    (taiyiArchiveResult.ok &&
      (taiyiArchiveResult.reason?.includes("幂等") ||
        taiyiArchiveResult.reason?.includes("already") ||
        taiyiArchiveResult.reason?.includes("跳过重复")));

  if (!taiyiArchiveResult.ok) {
    return {
      ok: false as const,
      error: taiyiArchiveResult.reason ?? "Taiyi 归档失败",
      reason: result.reason,
      openspec,
      stdout: result.stdout,
      state,
      taiyiArchive: taiyiArchiveResult,
    };
  }

  const text = formatTaiyiArchivePlain(slug, taiyiArchiveResult);

  return {
    ok: true as const,
    skipped: idempotent ? (true as const) : undefined,
    alreadyArchived: idempotent ? (true as const) : undefined,
    reason: idempotent ? (taiyiArchiveResult.reason ?? result.reason) : result.reason,
    openspec,
    stdout: result.stdout,
    state,
    taiyiArchive: taiyiArchiveResult,
    text,
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
  options?: { removeDir?: boolean },
): { ok: true; slug: string; workflowStatus: "aborted"; removed?: boolean } | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveChangeSlug(taiyiRoot, slug);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const engine = createEngine(workspaceDir);
  const result = engine.abortChange(resolved.slug);
  if (!result.ok) return { ok: false, error: result.error ?? "abort failed" };
  let removed = false;
  if (options?.removeDir) {
    const dir = engine.changeDir(resolved.slug);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      removed = true;
    }
    clearRuntimeForSlug(taiyiRoot, resolved.slug);
  }
  return { ok: true, slug: resolved.slug, workflowStatus: "aborted", removed };
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
):
  | {
      ok: true;
      slug: string;
      path: string;
      noop?: boolean;
      message?: string;
      engineTruth: ReturnType<typeof buildEngineTruth>;
    }
  | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = slug?.trim()
    ? resolveChangeSlug(taiyiRoot, slug)
    : resolveActiveSlug(taiyiRoot);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const engine = createEngine(workspaceDir);
  const stateResult = requireChangeState(engine, resolved.slug);
  if (!stateResult.ok) return stateResult;
  const state = stateResult.state;
  const changeDir = resolveChangeDir(taiyiRoot, resolved.slug);
  if (!changeDir) {
    return { ok: false, error: formatChangeNotFound(resolved.slug) };
  }
  const guide = buildPhaseGuide(taiyiRoot, resolved.slug, state, workspaceDir);
  const statusLine = formatPhaseProgressLine(guide);
  const engineTruth = buildEngineTruth(state, guide, {
    handoffExists: handoffExists(changeDir),
    taiyiRoot,
  });

  if (isWorkflowCompleted(state) || isTaiyiArchived(taiyiRoot, resolved.slug)) {
    return {
      ok: true,
      slug: resolved.slug,
      path: handoffPath(changeDir),
      noop: true,
      message: isTaiyiArchived(taiyiRoot, resolved.slug)
        ? "变更已归档，无需 handoff"
        : "变更已完成，无需 handoff；可用 /taiyi:archive 或 git commit 收尾",
      engineTruth,
    };
  }

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
  return {
    ok: true,
    slug: resolved.slug,
    path: filePath,
    engineTruth: buildEngineTruth(state, guide, { handoffExists: true, taiyiRoot }),
  };
}

export function taiyiList(workspaceDir: string, options?: ListChangesOptions) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const changes = listChanges(taiyiRoot, options);
  return { ok: true as const, changes, taiyiRoot };
}

export function taiyiResume(
  workspaceDir: string,
  slug?: string,
  plain = true,
):
  | { ok: true; slug: string; hasHandoff: boolean; handoffPath: string; text: string; statusText?: string }
  | { ok: false; error: string } {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = slug?.trim()
    ? resolveChangeSlug(taiyiRoot, slug)
    : resolveActiveSlug(taiyiRoot);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const state = loadChangeState(taiyiRoot, resolved.slug);
  if (!state) return { ok: false, error: formatChangeNotFound(resolved.slug) };
  const changeDir = resolveChangeDir(taiyiRoot, resolved.slug)!;
  const handoffPath = path.join(changeDir, "HANDOFF.md");
  const hasHandoff = fs.existsSync(handoffPath);
  const handoffBody = hasHandoff ? fs.readFileSync(handoffPath, "utf8") : "";
  const status = taiyiStatus(workspaceDir, resolved.slug);
  const statusText =
    status.ok && "text" in status && typeof status.text === "string"
      ? status.text
      : undefined;
  const lines = ["══ Taiyi Resume ══", ""];
  if (hasHandoff) {
    lines.push("── HANDOFF ──", handoffBody.trim(), "");
  } else {
    lines.push("（无 HANDOFF.md — 暂停时可用 /taiyi:handoff 生成）", "");
  }
  if (statusText) {
    lines.push("── Status ──", statusText);
  }
  const text = lines.join("\n");
  if (plain) {
    return {
      ok: true,
      slug: resolved.slug,
      hasHandoff,
      handoffPath,
      text,
      statusText,
    };
  }
  return { ok: true, slug: resolved.slug, hasHandoff, handoffPath, text, statusText };
}

const GSTACK_SLASH_ONLY = [
  "ship 仅聊天斜杠 — 加载 gstack `ship` Skill 或 prompts/taiyi-ship.md",
  "land 仅聊天斜杠 — 加载 gstack `land-and-deploy` 或 prompts/taiyi-land.md",
  "commit 仅聊天斜杠 — /taiyi:commit 或 taiyi commit-trailers",
].join("\n");

export function taiyiSlashOnlyHint(command: "ship" | "land" | "commit"): {
  ok: false;
  error: string;
  text: string;
} {
  const line =
    command === "ship"
      ? GSTACK_SLASH_ONLY.split("\n")[0]!
      : command === "land"
        ? GSTACK_SLASH_ONLY.split("\n")[1]!
        : GSTACK_SLASH_ONLY.split("\n")[2]!;
  return {
    ok: false,
    error: line,
    text: `${line}\n\n引擎 CLI 无 ${command} 子命令；交付链见 docs/taiyi/delivery-slash.md`,
  };
}

/** 仅聊天斜杠、无 shell 子命令（explore / flow / e2e …） */
export function taiyiChatSlashOnlyHint(verb: string): { ok: false; error: string; text: string } {
  const line = `${verb} 仅聊天斜杠 — 在 IDE 中用 /taiyi:${verb} 加载对应 Skill（引擎 CLI 无 shell 实现）`;
  return {
    ok: false,
    error: line,
    text: `${line}\n见 docs/taiyi/canonical-commands.md`,
  };
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
  if (!state) return { ok: false as const, error: formatChangeNotFound(slug) };
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
  if (!state) return { ok: false as const, error: formatChangeNotFound(slug) };
  const changeDir = path.join(resolveTaiyiRoot(workspaceDir), "changes", slug);
  const harness = getHarnessContext(workspaceDir, slug, state.currentPhase);
  const match = harness.hooks.find((h) => hookKey(h) === hookRef || h.skill === hookRef);
  if (!match) {
    const available = harness.hooks.map((h) => hookKey(h));
    return {
      ok: false as const,
      error: formatUnknownHarnessHook(hookRef, available),
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
  options?: { slug?: string; plain?: boolean; compact?: boolean },
) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const report = auditWorkspace(workspaceDir, taiyiRoot, { slug: options?.slug });
  if (options?.plain !== false) {
    const text = options?.compact ? formatAuditCompact(report) : formatAuditPlain(report);
    return { ok: report.ok, text, report };
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
  if (!state) return { ok: false as const, error: formatChangeNotFound(resolved) };

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
  if (!state) return { ok: false as const, error: formatChangeNotFound(slug) };
  const file = writeCiAgentPrompt(workspaceDir, resolveTaiyiRoot(workspaceDir), state);
  return { ok: true as const, promptFile: file, phase: state.currentPhase };
}

export function taiyiHarnessRunShell(workspaceDir: string, slug: string) {
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const state = engine.getState(slug);
  if (!state) return { ok: false as const, error: formatChangeNotFound(slug) };
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
    return { ok: true as const, completed: true as const, message: completedWorkflowMessage(state) };
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
    return { ok: true as const, completed: true as const, message: completedWorkflowMessage(state) };
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
    ? resolveChangeSlug(taiyiRoot, options.slug.trim())
    : resolveActiveSlug(taiyiRoot);
  if (!slugResult.ok) return slugResult;

  const slug = slugResult.slug;
  const invalid = rejectInvalidSlug(slug);
  if (invalid) return invalid;

  const changeDir = resolveChangeDir(taiyiRoot, slug);
  if (!changeDir) {
    return { ok: false as const, error: formatChangeNotFound(slug) };
  }
  const state = loadChangeState(taiyiRoot, slug);
  const archived =
    isTaiyiArchived(taiyiRoot, slug) ||
    changeDir.includes(`${path.sep}archive${path.sep}`) ||
    Boolean(state && isWorkflowCompleted(state));
  const phase = (options?.phase ?? state?.currentPhase ?? "change") as PhaseId;

  if (sub === "compress") {
    if (archived || isTaiyiArchived(taiyiRoot, slug)) {
      return {
        ok: false as const,
        error: "变更已归档或已完成，token compress 仅适用于进行中的 active 变更（目录须在 .taiyi/changes/）",
      };
    }
    try {
      if (!fs.existsSync(changeDir) || !fs.statSync(changeDir).isDirectory()) {
        return {
          ok: false as const,
          error: `变更目录不存在: ${changeDir}（若已归档请用 token status/scan）`,
        };
      }
    } catch {
      return {
        ok: false as const,
        error: `无法访问变更目录: ${changeDir}`,
      };
    }
  }

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
  try {
    return { ok: true as const, text: tokenCompress(changeDir, slug, phase) };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : String(e),
    };
  }
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
    return { ok: false as const, error: formatChangeNotFound(resolved.slug) };
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

export function taiyiFeature(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean; create?: boolean },
) {
  const plain = options?.plain !== false;
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const engine = createEngine(workspaceDir);
  let arg = args?.trim();
  let createdSlug: string | undefined;
  if (arg) {
    const looksLikeSlug = /^[a-z0-9][a-z0-9-]*$/i.test(arg);
    const slug = looksLikeSlug ? arg : slugifyTitle(arg);
    if (!engine.getState(slug)) {
      engine.initChange(slug, {
        title: looksLikeSlug ? arg : arg,
        templatesDir: TEMPLATES_DIR,
        profile: "full",
      });
      createdSlug = slug;
      arg = slug;
    }
  }
  const result = runFeatureScenario(engine, taiyiRoot, arg);
  const text = createdSlug
    ? `已创建变更: ${createdSlug}\n\n${result.text}`
    : result.text;
  if (plain) return { ok: result.ok, text, result: { ...result, slug: createdSlug ?? result.slug } };
  return { ok: result.ok, result: { ...result, slug: createdSlug ?? result.slug } };
}

export function taiyiBug(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean; create?: boolean },
) {
  const plain = options?.plain !== false;
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const engine = createEngine(workspaceDir);
  let arg = args?.trim();
  let createdSlug: string | undefined;
  if (arg) {
    const looksLikeSlug = /^[a-z0-9][a-z0-9-]*$/i.test(arg);
    const slug = looksLikeSlug ? arg : slugifyTitle(arg);
    if (!engine.getState(slug)) {
      engine.initChange(slug, {
        title: looksLikeSlug ? arg : arg,
        templatesDir: TEMPLATES_DIR,
        profile: "lite",
      });
      createdSlug = slug;
      arg = slug;
    }
  }
  const result = runBugScenario(engine, taiyiRoot, arg);
  const text = createdSlug
    ? `已创建 lite 变更: ${createdSlug}\n\n${result.text}`
    : result.text;
  if (plain) return { ok: result.ok, text, result: { ...result, slug: createdSlug ?? result.slug } };
  return { ok: result.ok, result: { ...result, slug: createdSlug ?? result.slug } };
}

const SCENARIO_CREATE_PROFILE: Partial<Record<ScenarioId, ChangeProfile>> = {
  mvp: "spike",
  micro: "micro",
  nano: "nano",
  service: "api",
  "design-system": "ui",
};

function taiyiScenarioInternal(
  workspaceDir: string,
  scenario: ScenarioId,
  args?: string,
  options?: { plain?: boolean; create?: boolean },
) {
  const plain = options?.plain !== false;
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const engine = createEngine(workspaceDir);
  let arg = args?.trim();
  let createdSlug: string | undefined;
  const createProfile = SCENARIO_CREATE_PROFILE[scenario] ?? resolveDefaultProfile(workspaceDir);

  if (options?.create && arg) {
    const looksLikeSlug = /^[a-z0-9][a-z0-9-]*$/i.test(arg);
    const slug = looksLikeSlug ? arg : slugifyTitle(arg);
    if (!engine.getState(slug)) {
      engine.initChange(slug, {
        title: arg,
        templatesDir: TEMPLATES_DIR,
        profile: createProfile,
      });
      createdSlug = slug;
      arg = slug;
    }
  }

  const result = runScenario(engine, taiyiRoot, scenario, arg);
  const text = createdSlug
    ? `已创建 ${createProfile} 变更: ${createdSlug}\n\n${result.text}`
    : result.text;
  if (plain) {
    return { ok: result.ok, text, result: { ...result, slug: createdSlug ?? result.slug } };
  }
  return { ok: result.ok, result: { ...result, slug: createdSlug ?? result.slug } };
}

function normalizeFlowTopic(topic: string): ScenarioId {
  const map: Record<string, ScenarioId> = {
    feature: "feature",
    bug: "bug",
    mvp: "mvp",
    spike: "mvp",
    micro: "micro",
    nano: "nano",
    quick: "nano",
    service: "service",
    api: "service",
    "design-system": "design-system",
    design: "design-system",
    ui: "design-system",
    ci: "ci",
    devops: "ci",
  };
  return map[topic.toLowerCase()] ?? "feature";
}

export function taiyiFlow(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean },
) {
  const plain = options?.plain !== false;
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const engine = createEngine(workspaceDir);
  const parts = args?.trim().split(/\s+/).filter(Boolean) ?? [];
  const first = parts[0]?.toLowerCase();
  const knownTopics = new Set([
    "feature",
    "bug",
    "mvp",
    "spike",
    "micro",
    "nano",
    "quick",
    "service",
    "api",
    "design-system",
    "design",
    "ui",
    "ci",
    "devops",
  ]);
  const result =
    parts.length === 0
      ? runFlowScenario(engine, taiyiRoot)
      : first && knownTopics.has(first)
        ? runScenario(
            engine,
            taiyiRoot,
            normalizeFlowTopic(first),
            parts.slice(1).join(" ").trim() || undefined,
          )
        : runFlowScenario(engine, taiyiRoot, first);
  if (plain) return { ok: result.ok, text: result.text, result };
  return { ok: result.ok, result: { ...result, text: result.text } };
}

export function taiyiMvp(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean; create?: boolean },
) {
  return taiyiScenarioInternal(workspaceDir, "mvp", args, options);
}

export function taiyiMicro(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean; create?: boolean },
) {
  return taiyiScenarioInternal(workspaceDir, "micro", args, options);
}

export function taiyiNano(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean; create?: boolean },
) {
  return taiyiScenarioInternal(workspaceDir, "nano", args, options);
}

export function taiyiService(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean; create?: boolean },
) {
  return taiyiScenarioInternal(workspaceDir, "service", args, options);
}

export function taiyiDesignSystem(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean; create?: boolean },
) {
  return taiyiScenarioInternal(workspaceDir, "design-system", args, options);
}

export function taiyiCiScenario(
  workspaceDir: string,
  args?: string,
  options?: { plain?: boolean },
) {
  return taiyiScenarioInternal(workspaceDir, "ci", args, { ...options, create: false });
}

export function taiyiStopMode(
  workspaceDir: string,
  options?: { force?: boolean; slug?: string; mode?: TaiyiModeId },
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

export function taiyiMilestone(
  workspaceDir: string,
  options?: { includeArchived?: boolean },
  plain = true,
) {
  try {
    const taiyiRoot = resolveTaiyiRoot(workspaceDir);
    const report = queryMilestone(taiyiRoot, options);
    const text = formatMilestonePlain(report);
    if (plain) return { ok: true as const, text, report };
    return { ok: true as const, report, text };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const text = "milestone 失败: " + error;
    if (plain) return { ok: false as const, text, error };
    return { ok: false as const, error, text };
  }
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
      error: formatUnknownWorkflowSkill(skill, listWorkflowSkills()),
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
  const text = banner ? `${banner}\n\n${step.text}` : step.text;
  const exitCode = step.exitCode ?? (step.ok ? 0 : 1);
  if (plain) return { ok: step.ok, text, step, exitCode };
  return { ok: step.ok, step: { ...step, text }, exitCode };
}

export function taiyiTrimAhead(workspaceDir: string, slug?: string, plain = true) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const resolved = resolveActiveSlug(taiyiRoot, slug);
  if (!resolved.ok) return resolved;
  const invalid = rejectInvalidSlug(resolved.slug);
  if (invalid) return invalid;
  const engine = createEngine(workspaceDir);
  const state = engine.getState(resolved.slug);
  if (!state) return { ok: false as const, error: formatChangeNotFound(resolved.slug) };
  const changeDir = engine.changeDir(resolved.slug);
  const result = trimAheadArtifacts(changeDir, state);
  const text = formatTrimAheadPlain(resolved.slug, result);
  if (plain) return { ok: true, text, result };
  return { ok: true, result, text };
}

export function taiyiPrune(workspaceDir: string, options?: { dryRun?: boolean; includeAborted?: boolean }, plain = true) {
  const taiyiRoot = resolveTaiyiRoot(workspaceDir);
  const orphans = pruneOrphanChangeDirs(taiyiRoot, {
    dryRun: options?.dryRun,
    includeAborted: options?.includeAborted,
  });
  const runtimeOrphans = pruneOrphanRuntimeModes(taiyiRoot, { dryRun: options?.dryRun });
  const staleRuntime = pruneStaleRuntimeModes(taiyiRoot, { dryRun: options?.dryRun });
  const dirText = formatPrunePlain(orphans, Boolean(options?.dryRun), options?.includeAborted);
  const rtText = formatOrphanRuntimePlain(runtimeOrphans, Boolean(options?.dryRun));
  const staleText = formatStaleRuntimePlain(staleRuntime, Boolean(options?.dryRun));
  const text = [dirText, rtText, staleText].filter(Boolean).join("\n\n");
  if (plain) return { ok: true, text, orphans, runtimeOrphans, staleRuntime };
  return { ok: true, orphans, runtimeOrphans, staleRuntime, text };
}
