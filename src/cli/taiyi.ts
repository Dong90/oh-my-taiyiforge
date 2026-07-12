#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { WorkflowEngine } from "../core/workflow-engine.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolvePackageRoot, resolveTemplatesDir } from "../core/package-root.js";
import { formatChangeListPlain, formatPhaseProgressLine, formatStatusCompact, formatStatusPlain } from "../core/format-guide.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { isChangeAborted, isWorkflowCompleted, expectedPhaseCount } from "../core/change-status.js";
import { resolveActiveSlug, slugifyTitle } from "../core/active-slug.js";
import { resolveAutoHarness } from "../core/resolve-auto-harness.js";
import { formatChangeNotFound, parseProfileFlag } from "../core/cli-hints.js";
import { resolveDefaultProfile } from "../core/project-config.js";
import { runInitWizard } from "../commands/init-wizard.js";
import { importFromGitBranch } from "../commands/import-tool.js";
import type { ChangeProfile, PhaseId } from "../core/types.js";
import {
  taiyiArchive, taiyiCancel, taiyiHandoff,
  taiyiHarness, taiyiList, taiyiMilestone, taiyiNext,
  taiyiResume, taiyiStatus, taiyiCiVerify, taiyiCiPlatform, taiyiCiPrompt,
  taiyiToken, taiyiWrite, taiyiChatSlashOnlyHint,
  taiyiHarnessCheck, taiyiMarkAux,
  taiyiAssess, taiyiModes,
  taiyiRemember, taiyiKeyword,
  taiyiCommitTrailers, taiyiSyncOpenspec,
  taiyiDeliveryPlan,
  taiyiFeature, taiyiBug, taiyiPrune,
  taiyiTrimAhead,
  taiyiComplete, taiyiPhases, taiyiUndo, taiyiRender,
  taiyiDoctor, taiyiAudit, taiyiHealth,
  taiyiReviewCheck, taiyiReviewLoop,
  taiyiRalph, taiyiAutopilot, taiyiUltrawork, taiyiTeam,
  taiyiStep, taiyiStopMode, taiyiAgent, taiyiFlow, taiyiWorkflowSkill,
  taiyiPhaseWrite, taiyiProjectPlan,
} from "../plugin/handlers.js";
import { PHASE_SLASH_VERB } from "../core/phase-write.js";
import { buildDoctorJsonCompact } from "../core/doctor.js";
import { buildAuditJsonCompact } from "../core/workflow-audit.js";
import { listWorkflowSkills } from "../core/runtime/workflow-skills.js";
import { runBrowserSmoke } from "../core/browser-smoke.js";
import { runWalkthrough, formatWalkthroughPlain } from "../core/walkthrough.js";
import type { CiPlatformId } from "../core/ci-platform.js";
import { parseRepeatCount } from "../core/repeat-parse.js";
import { formatArchivePlain } from "../core/format-integration.js";
import {
  formatAgentLoopProtocol, formatLoopResultPlain,
  runContinueRepeat, runLoopUntilComplete,
} from "../core/loop-runner.js";
import { SLASH_ONLY, LEGACY_REDIRECT, REMOVED_CLI } from "../core/command-registry.js";
import { registerSignalHandlers } from "../core/graceful-shutdown.js";
import { getLogger } from "../core/logger.js";
import { logActivity } from "../core/activity-log.js";
import { runDaemonLoop, readDaemonState, formatDaemonResultPlain } from "../core/daemon-runner.js";
import type { TaiyiModeId } from "../core/runtime/mode-state.js";

const log = getLogger();

/** Non-local control flow for unified process.exit at end of main(). */
class CliExit extends Error {
  constructor(readonly code: number) {
    super("cli-exit");
    this.name = "CliExit";
  }
}

function requestExit(code: number): never {
  throw new CliExit(code);
}

// Per-slug 去抖（避免单进程内对同一 slug 5s 内重复 status 调用）
// 用 Map 隔离不同 slug，跨 slug 不互相影响
const lastStatusCallAtPerSlug = new Map<string, number>();

const workspaceDir = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspaceDir);
const jsonMode = process.argv.includes("--json");
const compactMode = process.argv.includes("--compact");

function usage(): void {
  console.log(`TaiyiForge

日常:  new <t> [--profile p]  |  status [slug]  |  write [slug]
       continue [slug] [xN]   |  render [slug] [phase]
       undo [slug] [phase]
       apply [slug]           |  loop [slug] [xN]
       list [--all] [--dashboard]  |  archive [slug]
       cancel [slug]           |  handoff [slug]  |  resume [slug]
       init-wizard             |  import <branch>

 排查:  doctor [--strict-workspace]  |  audit [slug]  |  health [slug]
       verify [slug]
       token status|record|compress  |  ci platform|verify|prompt
       review-loop|review-check [slug]  |  flow [scenario] [title]
       change…integration [slug]  |  plan [file] [--auto]

引擎:  ralph|autopilot|ultrawork|team|step|stop-mode|agent [slug]
       browser-smoke  |  ralplan|ultraqa …（plan <slug> = change 级 workflow）

其他:  /taiyi:commit  /taiyi:ship  /taiyi:land
       /taiyi:skill …  /taiyi:mode …  /taiyi:diagram …

Profile: full | api | ui | lite | spike | micro | nano
Legacy: init→new · done→continue · ls→list · check→harness · handoff→pause
`);
}

const CLI_ALIASES: Record<string, string> = {
  handoff: "pause",
  ls: "list",
  run: "walkthrough",
  check: "harness",
  n: "next",
  go: "next",
  done: "continue",
  ok: "continue",
};
function normalizeCliCommand(raw?: string): string | undefined {
  if (!raw) return undefined;
  return CLI_ALIASES[raw] ?? raw;
}

const templatesDir = resolveTemplatesDir(import.meta.url);
const engine = new WorkflowEngine(taiyiRoot, templatesDir);
registerSignalHandlers(taiyiRoot);
const argv = process.argv.slice(2).filter((a: string) => a !== "--json" && a !== "--compact");
const [rawCmd, ...args] = argv;
const cmd = normalizeCliCommand(rawCmd);

/** Resolve --profile for init/new; null = invalid flag (caller must abort). */
function resolveProfileForInit(argv: string[]): ChangeProfile | null {
  const parsed = parseProfileFlag(argv);
  if (!parsed.ok) {
    log.error(parsed.error);
    return null;
  }
  return parsed.profile ?? resolveDefaultProfile(workspaceDir);
}

/** Optional --profile for walkthrough; null = invalid flag. */
function resolveOptionalProfile(argv: string[]): ChangeProfile | undefined | null {
  const parsed = parseProfileFlag(argv);
  if (!parsed.ok) {
    log.error(parsed.error);
    return null;
  }
  return parsed.profile;
}

function extractApprover(argv: string[]): { argv: string[]; approver?: string } {
  const out: string[] = [];
  let approver: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--approver" && argv[i + 1]) { approver = argv[++i]; continue; }
    out.push(a);
  }
  return { argv: out, approver };
}

const FLAGS_WITH_VALUE = new Set(["--profile", "--approver", "--title", "--phase", "--slug"]);

function stripFlags(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (FLAGS_WITH_VALUE.has(a)) { i++; continue; }
    if (a.startsWith("--")) continue;
    out.push(a);
  }
  return out;
}

function requireSlug(argv: string[]): string { return requireSlugAndRepeat(argv).slug; }
function requireSlugAndRepeat(argv: string[]): { slug: string; times: number } {
  const { positional, times } = parseRepeatCount(stripFlags(argv));
  const r = resolveActiveSlug(taiyiRoot, positional[0]);
  if (!r.ok) { log.error(r.error); throw new Error(r.error); }
  return { slug: r.slug, times };
}

type CompleteAttempt =
  | { ok: true }
  | { ok: false; error: string; qualityHints?: string[] };

function tryCompletePhase(slug: string, options?: { approver?: string; phaseId?: PhaseId }): CompleteAttempt {
  const state = engine.getState(slug);
  if (!state) return { ok: false, error: formatChangeNotFound(slug) };
  if (isWorkflowCompleted(state)) return { ok: true };
  const phaseId = options?.phaseId ?? (state.currentPhase as PhaseId);
  const result = taiyiComplete(workspaceDir, slug, phaseId, {
    human: options?.approver
      ? { approved: true, approver: options.approver }
      : undefined,
  });
  if (!result.ok) {
    const err = result.error ?? "complete failed";
    return {
      ok: false,
      error: err.includes("approver") ? "人工审批: --approver 名" : err,
      qualityHints: "qualityHints" in result ? result.qualityHints : undefined,
    };
  }
  return { ok: true };
}

function runNextGuide(a: string[]): void {
  const slug = requireSlug(a);
  const r = taiyiNext(workspaceDir, slug, !jsonMode);
  if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
  if (jsonMode) console.log(JSON.stringify({ guide: r.guide }, null, 2));
  else if ("text" in r && r.text) console.log(r.text);
}

function runInitChange(slug: string, title: string, a: string[]): void {
  const profile = resolveProfileForInit(a);
  if (profile === null) {
    process.exitCode = 1;
    return;
  }
  try {
    const result = engine.initChange(slug, {
      title,
      templatesDir,
      profile,
      strictDev: a.includes("--strict-dev"),
      autoHarness: resolveAutoHarness(a, false),
      force: a.includes("--force"),
    });
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else {
      const guide = buildPhaseGuide(taiyiRoot, slug, result, workspaceDir);
      console.log(formatStatusCompact(guide));
    }
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

function printCompleteSuccess(slug: string, phaseId: PhaseId): void {
  const state = engine.getState(slug);
  if (jsonMode) { console.log(JSON.stringify(state, null, 2)); return; }
  if (state && isWorkflowCompleted(state)) { console.log("✓ " + phaseId + " 已完成，可归档"); return; }
  const done = state ? state.completedPhases.length : 0;
  const total = state ? expectedPhaseCount(state) : 9;
  const nextPhase = state ? state.currentPhase as string : null;
  const nextArtifact = nextPhase === "dev" ? ".dev-complete" : nextPhase ? `${nextPhase.toUpperCase()}.md` : "CHANGELOG.md";
  if (nextPhase === null || (state && isWorkflowCompleted(state))) {
    console.log(`✓ ${phaseId} 过关 (${done}/${total}) → 全部完成，可归档`);
  } else {
    console.log(`✓ ${phaseId} 过关 (${done}/${total}) → ${nextPhase}：写 ${nextArtifact}`);
  }
}

function parseOptionalSlug(vArgs: string[]): string | undefined {
  const idx = vArgs.indexOf("--slug");
  if (idx >= 0 && vArgs[idx + 1]) return vArgs[idx + 1];
  const { positional } = parseRepeatCount(stripFlags(vArgs));
  return positional[0];
}

function runVerifyCommand(verifyArgs: string[]): void {
  const r = taiyiCiVerify(workspaceDir, { slug: parseOptionalSlug(verifyArgs), requireComplete: verifyArgs.includes("--require-complete"), plain: !jsonMode });
  if (jsonMode) console.log(JSON.stringify(r.report, null, 2));
  else if ("text" in r && r.text) console.log(r.text);
  if (!r.ok) process.exitCode = 1; return;
}

type HandlerLike = { ok: boolean; text?: string; error?: string };

function emitHandlerResult(r: HandlerLike): void {
  if (jsonMode) console.log(JSON.stringify(r, null, 2));
  else if (r.text) console.log(r.text);
  else if (r.error) log.error(r.error);
  if (!r.ok) process.exitCode = 1;
}

function emitWorkflowSkillResult(r: HandlerLike & { error?: string }): void {
  if (!r.ok) {
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if (r.text) console.log(r.text);
    else if (r.error) log.error(r.error);
    process.exitCode = 1;
    return;
  }
  emitHandlerResult(r);
}

function resolveSlugArg(a: string[]): { ok: true; slug: string } | { ok: false; error: string } {
  const { positional } = parseRepeatCount(stripFlags(a));
  return resolveActiveSlug(taiyiRoot, positional[0]);
}

// ── Command handlers (registry pattern) ──
type CliHandler = (a: string[]) => void | Promise<void>;
const handlers: Record<string, CliHandler> = {
  verify: () => runVerifyCommand(args),
  list: (a) => {
    if (a.includes("--dashboard")) {
      const r = taiyiMilestone(workspaceDir, { includeArchived: a.includes("--all") || a.includes("--archived") }, !jsonMode);
      if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
      if (jsonMode) console.log(JSON.stringify(r.report, null, 2));
      else console.log(r.text);
      return;
    }
    const r = taiyiList(workspaceDir, { includeAll: a.includes("--all"), includeArchived: a.includes("--archived") });
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(formatChangeListPlain(r.changes));
  },
  init: (a) => {
    const titleIdx = a.indexOf("--title");
    const title = titleIdx >= 0 && a[titleIdx + 1] ? a[titleIdx + 1] : stripFlags(a).join(" ").trim() || "unnamed";
    const slug = a[0] && !a[0].startsWith("--") ? a[0]! : slugifyTitle(title);
    runInitChange(slug, title, a);
  },
  new: (a) => {
    const positional = stripFlags(a);
    const first = positional[0] ?? "";
    const firstIsSlug = positional.length >= 2 && /^[a-z0-9][a-z0-9-]{0,47}$/.test(first);
    const slug = firstIsSlug ? first : null;
    const title = firstIsSlug ? positional.slice(1).join(" ").trim() : positional.join(" ").trim();
    if (!title) {
      log.error("用法: new <slug> <标题> 或 new <标题> [--profile full|lite|api|micro|nano|spike|ui]");
      process.exitCode = 1;
      return;
    }
    runInitChange(slug ?? slugifyTitle(title), title, a);
  },
  cancel: (a) => {
    const removeDir = a.includes("--remove-dir");
    const slug = requireSlug(stripFlags(a));
    const result = taiyiCancel(workspaceDir, slug, { removeDir });
    if (!result.ok) { log.error(result.error); process.exitCode = 1; return; }
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else { console.log("已取消变更: " + result.slug); if (result.removed) console.log("变更目录已删除。"); }
  },
  undo: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const targetPhase = a.includes("--phase") && a[a.indexOf("--phase") + 1] ? a[a.indexOf("--phase") + 1] : positional[1];
    const r = taiyiUndo(workspaceDir, slug, targetPhase, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  render: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slugResult = resolveActiveSlug(taiyiRoot, positional[0]);
    if (!slugResult.ok) { log.error(slugResult.error); process.exitCode = 1; return; }
    const phaseArg = positional[1] as PhaseId | undefined;
    const r = taiyiRender(workspaceDir, slugResult.slug, phaseArg, { plain: !jsonMode });
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) { log.error("error" in r ? r.error : "render 失败"); process.exitCode = 1; }
  },
  continue: async (a) => {
    const { argv: continueArgs, approver } = extractApprover(a);
    const { slug, times } = requireSlugAndRepeat(continueArgs);
    if (times > 1) {
      const result = runContinueRepeat(engine, workspaceDir, taiyiRoot, slug, times);
      if (jsonMode) console.log(JSON.stringify(result, null, 2));
      else console.log(formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir));
      requestExit(result.ok ? 0 : 1);
    }
    const state = engine.getState(slug);
    if (!state) { log.error(formatChangeNotFound(slug)); process.exitCode = 1; return; }
    if (isWorkflowCompleted(state)) { console.log("变更 " + slug + " 已完成，可归档"); return; }
    if (isChangeAborted(state)) { log.error("变更 " + slug + " 已取消"); process.exitCode = 1; return; }
    const phaseId = state.currentPhase as PhaseId;
    let attempt = tryCompletePhase(slug, { approver });
    if (attempt.ok) { printCompleteSuccess(slug, phaseId); return; }

    const afEngine = engine as any;
    if (afEngine.aiAutoFixFn) {
      try {
        const af = await afEngine.tryAutoFix(slug, phaseId, { quality: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true }, human: approver ? { approved: true, approver } : { approved: false, approver: "" } });
        if (af.ok) { printCompleteSuccess(slug, phaseId); return; }
      } catch (e) { log.warn("auto-fix failed: " + String(e)); }
    }

    const r = taiyiNext(workspaceDir, slug, !jsonMode);
    if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
    if (jsonMode) {
      console.log(JSON.stringify({ blocked: attempt.error, qualityHints: attempt.qualityHints, guide: r.guide }, null, 2));
    } else {
      if (r.guide) console.log(formatPhaseProgressLine(r.guide));
      console.log("\n未过关: " + attempt.error + "\n");
      if ("text" in r && r.text) console.log(r.text);
    }
    process.exitCode = 1;
  },
  apply: (a) => {
    const { slug, times } = requireSlugAndRepeat(a);
    const state = engine.getState(slug);
    if (!state) { log.error(formatChangeNotFound(slug)); process.exitCode = 1; return; }
    if (isWorkflowCompleted(state)) { console.log("变更 " + slug + " 已完成，可归档"); return; }
    if (isChangeAborted(state)) { log.error("变更 " + slug + " 已取消"); process.exitCode = 1; return; }
    if (state.currentPhase !== "dev" && state.currentPhase !== "test") { log.error("当前阶段为「" + state.currentPhase + "」。apply 用于 dev/test"); process.exitCode = 1; return; }
    const h = taiyiHarness(workspaceDir, slug, !jsonMode);
    if (!h.ok) { log.error(h.error); process.exitCode = 1; return; }
    for (let i = 1; i <= times; i++) {
      if (!jsonMode) { if (times === 1) console.log("=== apply（" + state.currentPhase + "）===\n说明: 只输出清单，实现后 status → continue 过关\n"); else console.log("=== apply " + i + "/" + times + "（" + state.currentPhase + "）===\n"); }
      if (!jsonMode && "text" in h && h.text) { console.log(h.text); if (i < times) console.log(""); }
      else if (jsonMode) console.log(JSON.stringify({ round: i, total: times, ...h }, null, 2));
    }
  },
  loop: (a) => {
    const { positional, times, timesExplicit } = parseRepeatCount(stripFlags(a));
    const r = resolveActiveSlug(taiyiRoot, positional[0]);
    if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
    const result = runLoopUntilComplete(engine, workspaceDir, taiyiRoot, r.slug, timesExplicit ? times : undefined);
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir));
      if (!result.ok) console.log("\n" + formatAgentLoopProtocol(r.slug, result.loopRound, result.maxRounds));
    }
    requestExit(result.ok ? 0 : 1);
  },
  status: (a) => {
    const slug = requireSlug(a);
    const debounceMs = 5000;
    const now = Date.now();
    if (process.env.TAIYI_STATUS_DEBOUNCE !== "0") {
      const lastForSlug = lastStatusCallAtPerSlug.get(slug) ?? 0;
      if (now - lastForSlug < debounceMs) {
        log.error(`[taiyi] status ${slug} 在 5s 内重复调用,跳过`);
        return;
      }
    }
    lastStatusCallAtPerSlug.set(slug, now);
    const r = taiyiStatus(workspaceDir, slug);
    if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
    if (jsonMode) { const payload = compactMode ? { engineTruth: r.engineTruth, statusLine: formatPhaseProgressLine(r.guide), nextAction: r.guide.nextAction } : { engineTruth: r.engineTruth, state: r.state, guide: r.guide, openspec: r.openspec }; console.log(JSON.stringify(payload, null, 2)); }
    else if (compactMode) console.log(formatStatusCompact(r.guide));
    else console.log(formatStatusPlain(r.guide));
  },
  pause: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const resumeFlag = a.includes("--resume");
    if (resumeFlag) {
      const r = taiyiResume(workspaceDir, slug, !jsonMode);
      if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
      if (jsonMode) console.log(JSON.stringify(r, null, 2));
      else console.log(r.text);
      return;
    }
    const note = positional.slice(1).join(" ").trim() || undefined;
    const r = taiyiHandoff(workspaceDir, slug, note);
    if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("noop" in r && r.noop && r.message) console.log(r.message);
    else { console.log("已写入: " + r.path); console.log("恢复: status " + r.slug); }
  },
  resume: (a) => {
    const slug = stripFlags(a)[0];
    const r = taiyiResume(workspaceDir, slug, !jsonMode);
    if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(r.text);
  },
  archive: (a) => {
    const slug = requireSlug(a);
    const r = taiyiArchive(workspaceDir, slug, { skipSpecs: a.includes("--skip-specs") });
    if (r.ok && !r.alreadyArchived) {
      logActivity(taiyiRoot, { event: "change:archived", slug, reason: r.reason });
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if (r.ok) console.log(formatArchivePlain(slug, r));
    else log.error(formatArchivePlain(slug, r));
    if (!r.ok) process.exitCode = 1; return;
  },
  ci: (a) => {
    const [sub, ...rest] = a;
    if (sub === "verify") { runVerifyCommand(rest); return; }
    if (sub === "platform") { const platform = rest[0] as CiPlatformId; if (!platform || !["opencode", "claude", "codex", "cursor"].includes(platform)) { log.error("用法: ci platform <opencode|claude|codex|cursor>"); process.exitCode = 1; return; } const r = taiyiCiPlatform(resolvePackageRoot(import.meta.url), platform, !jsonMode); if ("text" in r && r.text) console.log(r.text); if (!r.ok) process.exitCode = 1; return; return; }
    if (sub === "prompt") { const slug = rest[0]; if (!slug) { log.error("用法: ci prompt <slug>"); process.exitCode = 1; return; } const r = taiyiCiPrompt(workspaceDir, slug); if (!r.ok) { log.error(r.error); process.exitCode = 1; return; } console.log(jsonMode ? JSON.stringify(r, null, 2) : "CI prompt: " + r.promptFile); return; }
    log.error("用法: ci verify | ci platform | ci prompt"); process.exitCode = 1; return;
  },
  token: (a) => {
    const [sub, ...tokenArgs] = a;
    const phaseIdx = tokenArgs.indexOf("--phase"); const phase = (phaseIdx >= 0 ? tokenArgs[phaseIdx + 1] : undefined) as PhaseId | undefined;
    const { positional } = parseRepeatCount(stripFlags(tokenArgs));
    const effectiveSub = sub === "status" || !sub ? ("status" as const) : sub === "record" || sub === "scan" || sub === "compress" ? sub : null;
    if (!effectiveSub) { log.error("用法: token status|record|scan|compress"); process.exitCode = 1; return; }
    let slug: string | undefined; let tokens: number | undefined;
    if (effectiveSub === "record") { if (positional.length >= 2) { slug = positional[0]; tokens = Number(positional[1]); } else if (positional.length === 1) { const n = Number(positional[0]); if (Number.isFinite(n)) tokens = n; else slug = positional[0]; } }
    else if (positional[0]) slug = positional[0];
    const r = taiyiToken(workspaceDir, effectiveSub, { slug, tokens, phase });
    if (!r.ok) { log.error("error" in r ? r.error : "token failed"); process.exitCode = 1; return; }
    if ("text" in r && r.text) console.log(r.text);
  },
  write: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const r = taiyiWrite(workspaceDir, positional[0], !jsonMode);
    if (!r.ok) { log.error("error" in r ? r.error : r.text); process.exitCode = 1; return; }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
  },
  walkthrough: (a) => {
    const slug = parseOptionalSlug(a);
    const profile = resolveOptionalProfile(a);
    if (profile === null) {
      process.exitCode = 1;
      return;
    }
    const r = runWalkthrough(workspaceDir, { slug, profile });
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(formatWalkthroughPlain(r));
    if (!r.ok) process.exitCode = 1;
  },

  "harness-check": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const hookRef = positional[1];
    if (!slug || !hookRef) { log.error("[taiyi] 用法: harness-check <slug> <hook-ref>"); process.exitCode = 1; return; }
    const r = taiyiHarnessCheck(workspaceDir, slug, hookRef);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  "mark-aux": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const skillId = positional[1];
    if (!slug || !skillId) { log.error("[taiyi] 用法: mark-aux <slug> <skill-id>"); process.exitCode = 1; return; }
    const r = taiyiMarkAux(workspaceDir, slug, skillId);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if (r.ok) console.log(`已标记 auxiliary skill: ${skillId}`);
    else log.error(r.error ?? "未知错误");
    if (!r.ok) process.exitCode = 1; return;
  },

  next: (a) => runNextGuide(a),
  guide: (a) => runNextGuide(a),
  phases: () => {
    const phases = taiyiPhases();
    if (jsonMode) console.log(JSON.stringify(phases, null, 2));
    else {
      for (const p of phases) {
        console.log(`${p.order}. ${p.id} → ${p.skill} (${p.artifact})`);
      }
    }
  },
  harness: (a) => {
    const slug = requireSlug(a);
    const r = taiyiHarness(workspaceDir, slug, !jsonMode);
    if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
  },
  complete: (a) => {
    const { argv: completeArgs, approver } = extractApprover(a);
    const positional = stripFlags(completeArgs);
    if (!positional[0]) {
      log.error("用法: complete <slug> [phase] [--approver 名]");
      process.exitCode = 1;
      return;
    }
    const slugRes = resolveActiveSlug(taiyiRoot, positional[0]);
    if (!slugRes.ok) { log.error(slugRes.error); process.exitCode = 1; return; }
    const slug = slugRes.slug;
    const state = engine.getState(slug);
    if (!state) { log.error(formatChangeNotFound(slug)); process.exitCode = 1; return; }
    const phaseId = (positional[1] ?? state.currentPhase) as PhaseId;
    const r = taiyiComplete(workspaceDir, slug, phaseId, {
      human: approver ? { approved: true, approver } : undefined,
    });
    if (!r.ok) {
      log.error(r.error ?? "complete failed");
      process.exitCode = 1;
      return;
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else printCompleteSuccess(slug, phaseId);
  },
  // ── CLI handlers for commands removed from SLASH_ONLY ──
  assess: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiAssess(workspaceDir, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  modes: (a) => {
    const r = taiyiModes(workspaceDir, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },

  remember: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const note = positional.join(" ").trim() || undefined;
    const r = taiyiRemember(workspaceDir, note, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  keyword: (a) => {
    const prompt = a.join(" ").trim();
    const r = taiyiKeyword(workspaceDir, prompt, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },

  doctor: (a) => {
    const pkgRoot = resolvePackageRoot(import.meta.url);
    const strict = a.includes("--strict-workspace");
    const r = taiyiDoctor(pkgRoot, workspaceDir, { strictWorkspace: strict });
    if (jsonMode) {
      const payload = compactMode
        ? buildDoctorJsonCompact({ ok: r.ok, report: r.report })
        : r;
      console.log(JSON.stringify(payload, null, 2));
    } else {
      const lines = ["══ doctor ══", r.ok ? "✓ 通过" : "✗ 未通过"];
      for (const c of r.report.checks) {
        lines.push(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
      }
      for (const c of r.report.workspaceChecks ?? []) {
        lines.push(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
      }
      console.log(lines.join("\n"));
    }
    if (!r.ok) process.exitCode = 1;
  },
  audit: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const r = taiyiAudit(workspaceDir, { slug: positional[0], plain: !jsonMode, compact: compactMode });
    if (jsonMode) {
      const payload = compactMode && "report" in r ? buildAuditJsonCompact(r.report) : r;
      console.log(JSON.stringify(payload, null, 2));
    } else emitHandlerResult(r);
  },
  health: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const r = taiyiHealth(workspaceDir, positional[0]);
    emitHandlerResult(r);
  },
  "review-check": (a) => {
    const slugRes = resolveSlugArg(a);
    if (!slugRes.ok) { log.error(slugRes.error); process.exitCode = 1; return; }
    const r = taiyiReviewCheck(workspaceDir, slugRes.slug, !jsonMode);
    emitHandlerResult(r);
  },
  "review-loop": (a) => {
    const slugRes = resolveSlugArg(a);
    if (!slugRes.ok) { log.error(slugRes.error); process.exitCode = 1; return; }
    const r = taiyiReviewLoop(workspaceDir, slugRes.slug, !jsonMode);
    emitHandlerResult(r);
  },
  ralph: (a) => {
    const slugRes = resolveSlugArg(a);
    if (!slugRes.ok) { log.error(slugRes.error); process.exitCode = 1; return; }
    emitHandlerResult(taiyiRalph(workspaceDir, slugRes.slug, !jsonMode));
  },
  autopilot: (a) => {
    const slugRes = resolveSlugArg(a);
    if (!slugRes.ok) { log.error(slugRes.error); process.exitCode = 1; return; }
    emitHandlerResult(taiyiAutopilot(workspaceDir, slugRes.slug, !jsonMode));
  },
  ultrawork: (a) => {
    const slugRes = resolveSlugArg(a);
    if (!slugRes.ok) { log.error(slugRes.error); process.exitCode = 1; return; }
    emitHandlerResult(taiyiUltrawork(workspaceDir, slugRes.slug, !jsonMode));
  },
  team: (a) => {
    const slugRes = resolveSlugArg(a);
    if (!slugRes.ok) { log.error(slugRes.error); process.exitCode = 1; return; }
    emitHandlerResult(taiyiTeam(workspaceDir, slugRes.slug, !jsonMode));
  },
  step: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const modeIdx = a.indexOf("--mode");
    const mode = modeIdx >= 0 ? a[modeIdx + 1] : undefined;
    const r = taiyiStep(workspaceDir, positional[0], { mode }, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    else if ("error" in r && r.error) log.error(r.error);
    const code = "exitCode" in r && typeof r.exitCode === "number" ? r.exitCode : (r.ok ? 0 : 1);
    if (code !== 0) requestExit(code);
  },
  "stop-mode": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const modeIdx = a.indexOf("--mode");
    const r = taiyiStopMode(workspaceDir, {
      force: a.includes("--force"),
      slug: positional[0],
      mode: modeIdx >= 0 ? a[modeIdx + 1] as TaiyiModeId : undefined,
    }, !jsonMode);
    emitHandlerResult(r);
  },
  agent: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const role = positional[0];
    if (!role) { log.error("用法: agent <role|list> [slug]"); process.exitCode = 1; return; }
    const r = taiyiAgent(workspaceDir, role, positional[1], !jsonMode);
    emitHandlerResult(r);
  },
  flow: (a) => {
    const args = stripFlags(a).join(" ").trim() || undefined;
    const r = taiyiFlow(workspaceDir, args, { plain: !jsonMode });
    emitHandlerResult(r);
  },
  "browser-smoke": () => {
    const r = runBrowserSmoke(workspaceDir, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if (r.ok) console.log(r.text);
    else log.error(r.error);
    if (!r.ok) process.exitCode = 1;
  },

  "commit-trailers": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const subject = positional.slice(1).join(" ");
    const r = taiyiCommitTrailers(workspaceDir, slug, subject || undefined);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    else if (r.ok && "suggestion" in r) {
      console.log(r.suggestion);
      if (r.check && !r.check.passed && r.check.reason) {
        console.log(`\n# check: ${r.check.reason}`);
      }
    }
    if (!r.ok) process.exitCode = 1; return;
  },
  "delivery-plan": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiDeliveryPlan(workspaceDir, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if (r.ok) console.log(r.text);
    else log.error(r.error);
    if (!r.ok) process.exitCode = 1;
  },
  "sync-openspec": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    if (!slug) { log.error("[taiyi] 用法: sync-openspec <slug>"); process.exitCode = 1; return; }
    const r = taiyiSyncOpenspec(workspaceDir, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  feature: (a) => {
    const title = stripFlags(a).join(" ").trim();
    if (!title) { log.error("用法: feature <title>"); process.exitCode = 1; return; }
    const r = taiyiFeature(workspaceDir, title);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  bug: (a) => {
    const title = stripFlags(a).join(" ").trim();
    if (!title) { log.error("用法: bug <title>"); process.exitCode = 1; return; }
    const r = taiyiBug(workspaceDir, title);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  prune: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiPrune(workspaceDir, { dryRun: a.includes("--dry-run"), includeAborted: a.includes("--all") }, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else { if (r.ok) console.log(`prune: 已清理(runtime状态)`); else log.error("prune: " + (r.text ?? "失败")); }
    if (!r.ok) process.exitCode = 1; return;
  },
  "trim-ahead": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiTrimAhead(workspaceDir, slug, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  "smoke-reset": () => {
    log.error("[taiyi] smoke-reset 仅支持 scripts/taiyi-forge.sh smoke-reset (三通道向下)");
    requestExit(2);
  },
  daemon: (a) => {
    const [sub, ...daemonArgs] = a;
    const { positional } = parseRepeatCount(stripFlags(daemonArgs));
    const slug = positional[0];
    if (sub === "run") {
      if (!slug) { log.error("用法: daemon run <slug> [options]"); process.exitCode = 1; return; }
      const force = daemonArgs.includes("--force");
      const engineOnly = daemonArgs.includes("--engine-only");
      const dryRun = daemonArgs.includes("--dry-run");
      const result = runDaemonLoop(engine, workspaceDir, taiyiRoot, slug, { engineOnly, dryRun, force });
      const msg = formatDaemonResultPlain(result);
      if (jsonMode) console.log(JSON.stringify(result, null, 2));
      else console.log(msg);
      requestExit(result.ok ? 0 : 1);
    }
    if (sub === "status") {
      if (!slug) { log.error("用法: daemon status <slug>"); process.exitCode = 1; return; }
      const state = readDaemonState(taiyiRoot, slug);
      if (jsonMode) console.log(JSON.stringify(state, null, 2));
      else if (state) console.log(`daemon ${slug}: round=${state.round} active=${state.active}`);
      else log.error("daemon status: 未找到运行状态");
      requestExit(state ? 0 : 1);
    }
    log.error("用法: daemon run|status <slug>"); process.exitCode = 1; return;
  },
  "init-wizard": async () => {
    try {
      const result = await runInitWizard(workspaceDir);
      if (jsonMode) console.log(JSON.stringify(result, null, 2));
      else console.log("已写入 .taiyi/config.json: " + JSON.stringify(result));
    } catch (err: unknown) {
      log.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  },
  import: async (a: string[]) => {
    const branch = stripFlags(a)[0];
    if (!branch) { log.error("用法: import <branch-name>"); process.exitCode = 1; return; }
    try {
      const slug = await importFromGitBranch(branch, workspaceDir);
      if (jsonMode) console.log(JSON.stringify({ slug }, null, 2));
      else console.log("导入完成: " + slug);
    } catch (err: unknown) {
      log.error(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  },
};

function looksLikePlanFileArg(arg: string, cwd: string): boolean {
  if (arg.startsWith("http://") || arg.startsWith("https://")) return true;
  if (arg.includes("/") || arg.includes(".")) return true;
  return fs.existsSync(path.resolve(cwd, arg));
}

for (const phaseId of Object.keys(PHASE_SLASH_VERB) as PhaseId[]) {
  const verb = PHASE_SLASH_VERB[phaseId];
  handlers[verb] = (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    emitHandlerResult(taiyiPhaseWrite(workspaceDir, verb, positional[0], !jsonMode));
  };
}

handlers.plan = (a) => {
  const { positional } = parseRepeatCount(stripFlags(a));
  const first = positional[0];
  const auto = a.includes("--auto");
  if (!first || looksLikePlanFileArg(first, workspaceDir)) {
    const fileArg = first && looksLikePlanFileArg(first, workspaceDir) ? first : undefined;
    emitHandlerResult(taiyiProjectPlan(workspaceDir, fileArg, { plain: !jsonMode, auto }));
    return;
  }
  const slugRes = resolveSlugArg(a);
  if (!slugRes.ok) {
    log.error(slugRes.error);
    process.exitCode = 1;
    return;
  }
  emitWorkflowSkillResult(taiyiWorkflowSkill(workspaceDir, "plan", slugRes.slug, !jsonMode));
};

for (const skill of listWorkflowSkills()) {
  if (skill === "plan") continue;
  handlers[skill] = (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const r = taiyiWorkflowSkill(workspaceDir, skill, positional[0], !jsonMode);
    emitWorkflowSkillResult(r);
  };
}

// ── Dispatch ──
async function dispatch(cmd: string, rawCmd: string, args: string[]): Promise<void> {
  try {
    switch (cmd) {
      case "help": case "--help": case "-h": usage(); break;
      default: {
        if (cmd && REMOVED_CLI.has(cmd)) {
          log.error("[taiyi] \"" + cmd + "\" 已从顶栏移除；见 docs/taiyi/canonical-commands.md");
          process.exitCode = 1;
          return;
        }
        if (cmd && LEGACY_REDIRECT[cmd]) {
          log.error("[taiyi] \"" + cmd + "\" 已移除，请用 npx taiyi " + LEGACY_REDIRECT[cmd]);
          process.exitCode = 1;
          return;
        }
        if (rawCmd && SLASH_ONLY.has(rawCmd)) {
          const h = taiyiChatSlashOnlyHint(rawCmd);
          log.error(h.text);
          requestExit(2);
        }
        if (cmd && handlers[cmd]) {
          await handlers[cmd]!(args);
          break;
        }
        usage();
        requestExit(rawCmd ? 2 : 0);
      }
    }
  } catch (e) {
    if (e instanceof CliExit) throw e;
    log.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  try {
    await dispatch(cmd ?? "", rawCmd, args);
  } catch (e) {
    if (e instanceof CliExit) {
      process.exit(e.code);
      return;
    }
    throw e;
  }
  process.exit(process.exitCode ?? 0);
}

void main();
