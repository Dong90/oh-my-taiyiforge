#!/usr/bin/env node
import { WorkflowEngine } from "../core/workflow-engine.js";
import { buildDoctorJsonCompact } from "../core/doctor.js";
import { buildAuditJsonCompact } from "../core/workflow-audit.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolvePackageRoot, resolveTemplatesDir } from "../core/package-root.js";
import { resolveHumanForComplete } from "../core/gates/human-gate-config.js";
import { formatChangeListPlain, formatPhaseProgressLine, formatStatusCompact, formatStatusPlain } from "../core/format-guide.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { isChangeAborted, isWorkflowCompleted, completedWorkflowMessage, expectedPhaseCount } from "../core/change-status.js";
import { resolveActiveSlug, slugifyTitle } from "../core/active-slug.js";
import { resolveAutoHarness } from "../core/resolve-auto-harness.js";
import { getNextPhase } from "../core/phase-registry.js";
import { formatChangeNotFound, parseProfileFlag } from "../core/cli-hints.js";
import { resolveDefaultProfile } from "../core/project-config.js";
import { runInitWizard } from "../commands/init-wizard.js";
import { importFromGitBranch } from "../commands/import-tool.js";
import type { ChangeProfile, PhaseId } from "../core/types.js";
import {
  taiyiArchive, taiyiAudit, taiyiCancel, taiyiDoctor, taiyiHandoff,
  taiyiHarness, taiyiHealth, taiyiList, taiyiMilestone, taiyiNext,
  taiyiResume, taiyiStatus, taiyiCiVerify, taiyiCiPlatform, taiyiCiPrompt,
  taiyiToken, taiyiWrite, taiyiChatSlashOnlyHint,
  taiyiAgent, taiyiTeam, taiyiUltrawork,
  taiyiHarnessCheck, taiyiMarkAux,
  taiyiRalph,
  taiyiAutopilot,
  taiyiAssess, taiyiModes, taiyiStep, taiyiStopMode,
  taiyiRemember, taiyiKeyword,
  taiyiReviewCheck, taiyiReviewLoop,
  taiyiCommitTrailers, taiyiSyncOpenspec,
  taiyiFeature, taiyiBug, taiyiPrune,
  taiyiTrimAhead,
} from "../plugin/handlers.js";
import { runWalkthrough, formatWalkthroughPlain } from "../core/walkthrough.js";
import type { CiPlatformId } from "../core/ci-platform.js";
import { parseRepeatCount } from "../core/repeat-parse.js";
import { formatArchivePlain } from "../core/format-integration.js";
import {
  formatAgentLoopProtocol, formatLoopResultPlain,
  runContinueRepeat, runLoopUntilComplete,
} from "../core/loop-runner.js";
import { SLASH_ONLY, LEGACY_REDIRECT } from "../core/command-registry.js";
import { getLogger } from "../core/logger.js";
import { logActivity } from "../core/activity-log.js";

const log = getLogger();
import { runDaemonLoop, readDaemonState, formatDaemonResultPlain } from "../core/daemon-runner.js";

const workspaceDir = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspaceDir);
const jsonMode = process.argv.includes("--json");
const compactMode = process.argv.includes("--compact");

function usage(): void {
  console.log(`TaiyiForge

日常:  new <t> [--profile p]  |  status [slug]  |  write [slug]
       continue [slug] [xN]   |  apply [slug]   |  loop [slug] [xN]
       list [--all] [--dashboard]  |  archive [slug]
       cancel [slug]           |  handoff [slug]  |  resume [slug]
       init-wizard             |  import <branch>

排查:  doctor [--strict] [--json]  |  audit [slug]  |  verify [slug]
       token status|record|compress  |  ci platform|verify|prompt
       health [slug]

其他:  /taiyi:commit  /taiyi:ship  /taiyi:land  /taiyi:ralph  /taiyi:team
       /taiyi:mode ...  /taiyi:workflow ...  /taiyi:diagram ...

Profile: full | api | ui | lite | spike | micro | nano
Legacy: init→new · done→continue · next→status · handoff→pause
`);
}

const CLI_ALIASES: Record<string, string> = {
  handoff: "pause",
  ls: "list",
  run: "walkthrough",
  n: "next",
  go: "next",
  done: "continue",
};
function normalizeCliCommand(raw?: string): string | undefined {
  if (!raw) return undefined;
  return CLI_ALIASES[raw] ?? raw;
}

const templatesDir = resolveTemplatesDir(import.meta.url);
const engine = new WorkflowEngine(taiyiRoot, templatesDir);
const argv = process.argv.slice(2).filter((a: string) => a !== "--json" && a !== "--compact");
const [rawCmd, ...args] = argv;
const cmd = normalizeCliCommand(rawCmd);

function resolveProfileFromArgs(argv: string[]): ChangeProfile | undefined {
  const parsed = parseProfileFlag(argv);
  if (!parsed.ok) { log.error(parsed.error); process.exitCode = 1; return; }
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

function stripFlags(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--profile" || a === "--approver") { i++; continue; }
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

function tryCompletePhase(slug: string, options?: { approver?: string; phaseId?: PhaseId }) {
  const state = engine.getState(slug);
  if (!state) return { ok: false, error: formatChangeNotFound(slug) } as const;
  if (isWorkflowCompleted(state)) return { ok: true } as const;
  const phaseId = options?.phaseId ?? (state.currentPhase as PhaseId);
  const hr = resolveHumanForComplete(phaseId, options?.approver);
  if (!hr.ok) return { ok: false, error: hr.error.includes("approver") ? "人工审批: --approver 名" : hr.error } as const;
  const result = engine.completePhase(slug, phaseId, {
    quality: { completeness: true, consistency: true, verifiability: true, traceability: true, engineering_quality: true },
    human: hr.human,
  }, hr.allowAutoHuman ? { allowAutoHuman: true } : undefined);
  if (!result.ok) return { ok: false, error: result.error ?? "complete failed" } as const;
  return { ok: true } as const;
}

function printCompleteSuccess(slug: string, phaseId: PhaseId): void {
  const state = engine.getState(slug);
  if (jsonMode) { console.log(JSON.stringify(state, null, 2)); return; }
  if (state && isWorkflowCompleted(state)) { console.log("✓ " + phaseId + " 已完成，可归档"); return; }
  const nextPhase = state ? getNextPhase(state.currentPhase as PhaseId, state.skippedPhases) : null;
  const done = state ? state.completedPhases.length + 1 : 0;
  const total = state ? expectedPhaseCount(state) : 9;
  console.log(`✓ ${phaseId} 过关 (${done}/${total}) → ${nextPhase ?? "全部完成"}${nextPhase ? `：写 ${nextPhase.toUpperCase()}.md` : "，可归档"}`);
}

function printDoctor(doctorArgs: string[]): void {
  const strictWorkspace = doctorArgs.includes("--strict-workspace");
  const r = taiyiDoctor(undefined, workspaceDir, { strictWorkspace });
  if (jsonMode) { const p = compactMode ? buildDoctorJsonCompact(r) : r; console.log(JSON.stringify(p, null, 2)); if (!r.ok) process.exitCode = 1; return; return; }
  if (compactMode) {
    console.log("doctor " + (r.ok ? "PASS" : "FAIL") + " v" + r.report.version);
    const all = [...r.report.checks, ...(r.report.workspaceChecks ?? [])];
    const failed = all.filter(c => !c.ok);
    if (failed.length === 0) console.log("checks=" + all.length + " ok");
    else { for (const c of failed.slice(0, 8)) console.log("✗ " + c.id + ": " + c.detail); if (failed.length > 8) console.log("… +" + (failed.length - 8) + " more"); }
    if (!r.ok) process.exitCode = 1; return; return;
  }
  console.log("TaiyiForge doctor v" + r.report.version + " — " + (r.ok ? "PASS" : "FAIL") + "\n");
  console.log("安装:");
  for (const c of r.report.checks) console.log((c.ok ? "✓" : "✗") + " " + c.id + ": " + c.detail);
  if (r.report.workspaceChecks?.length) { console.log("\n工作区流程:"); for (const c of r.report.workspaceChecks) console.log((c.ok ? "✓" : "✗") + " " + c.id + ": " + c.detail); }
  if (!r.ok) { process.exitCode = 1; return; }
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

// ── Command handlers (registry pattern) ──
type CliHandler = (a: string[]) => void;
const handlers: Record<string, CliHandler> = {
  doctor: () => printDoctor(args),
  audit: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const r = taiyiAudit(workspaceDir, { slug: positional[0], plain: !jsonMode, compact: compactMode });
    if (jsonMode) console.log(JSON.stringify(compactMode ? buildAuditJsonCompact(r.report) : r.report, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  health: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const r = taiyiHealth(workspaceDir, positional[0]);
    if (!r.ok) { log.error("error" in r ? r.error : "health failed"); process.exitCode = 1; return; }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
  },
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
    try {
      const result = engine.initChange(slug, { title, templatesDir, profile: resolveProfileFromArgs(a) ?? resolveDefaultProfile(workspaceDir), strictDev: a.includes("--strict-dev"), autoHarness: resolveAutoHarness(a, false), force: a.includes("--force") });
      if (jsonMode) console.log(JSON.stringify(result, null, 2));
      else { const guide = buildPhaseGuide(taiyiRoot, slug, result, workspaceDir); console.log(formatStatusCompact(guide)); }
    } catch (e) { log.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; return; }
  },
  new: (a) => {
    const positional = stripFlags(a);
    const first = positional[0] ?? "";
    const firstIsSlug = positional.length >= 2 && /^[a-z0-9][a-z0-9-]{0,47}$/.test(first);
    const slug = firstIsSlug ? first : null;
    const title = firstIsSlug ? positional.slice(1).join(" ").trim() : positional.join(" ").trim();
    if (!title) { log.error("用法: new <slug> <标题> 或 new <标题> [--profile full|lite|api|micro|nano|spike|ui]"); process.exitCode = 1; return; }
    const resolvedSlug = slug ?? slugifyTitle(title);
    try {
      const result = engine.initChange(resolvedSlug, { title, templatesDir, profile: resolveProfileFromArgs(a) ?? resolveDefaultProfile(workspaceDir), strictDev: a.includes("--strict-dev"), autoHarness: resolveAutoHarness(a, false), force: a.includes("--force") });
      if (jsonMode) console.log(JSON.stringify(result, null, 2));
      else { const guide = buildPhaseGuide(taiyiRoot, resolvedSlug, result, workspaceDir); console.log(formatStatusCompact(guide)); }
    } catch (e) { log.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; return; }
  },
  cancel: (a) => {
    const removeDir = a.includes("--remove-dir");
    const slug = requireSlug(stripFlags(a));
    const result = taiyiCancel(workspaceDir, slug, { removeDir });
    if (!result.ok) { log.error(result.error); process.exitCode = 1; return; }
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else { console.log("已取消变更: " + result.slug); if (result.removed) console.log("变更目录已删除。"); }
  },
  continue: (a) => {
    const { argv: continueArgs, approver } = extractApprover(a);
    const { slug, times } = requireSlugAndRepeat(continueArgs);
    if (times > 1) { const result = runContinueRepeat(engine, workspaceDir, taiyiRoot, slug, times); if (jsonMode) console.log(JSON.stringify(result, null, 2)); else console.log(formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir)); process.exit(result.ok ? 0 : 1); }
    const state = engine.getState(slug);
    if (!state) { log.error(formatChangeNotFound(slug)); process.exitCode = 1; return; }
    if (isWorkflowCompleted(state)) { console.log("变更 " + slug + " 已完成，可归档"); return; }
    if (isChangeAborted(state)) { log.error("变更 " + slug + " 已取消"); process.exitCode = 1; return; }
    const phaseId = state.currentPhase as PhaseId;
    const attempt = tryCompletePhase(slug, { approver });
    if (attempt.ok) { printCompleteSuccess(slug, phaseId); return; }
    const r = taiyiNext(workspaceDir, slug, !jsonMode);
    if (!r.ok) { log.error(r.error); process.exitCode = 1; return; }
    if (jsonMode) console.log(JSON.stringify({ blocked: (attempt as any).error, guide: r.guide }, null, 2));
    else { if (r.guide) console.log(formatPhaseProgressLine(r.guide)); console.log("\n未过关: " + (attempt as any).error + "\n"); if ("text" in r && r.text) console.log(r.text); }
    process.exitCode = 1; return;
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
      if (!jsonMode) { if (times === 1) console.log("=== apply（" + state.currentPhase + "）===\n说明: 只输出清单，实现后 complete 过关\n"); else console.log("=== apply " + i + "/" + times + "（" + state.currentPhase + "）===\n"); }
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
    else { console.log(formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir)); if (!result.ok) console.log("\n" + formatAgentLoopProtocol(r.slug, result.loopRound, result.maxRounds)); }
    process.exit(result.ok ? 0 : 1);
  },
  status: (a) => {
    const debounceMs = 5000;
    const last = (globalThis as any).__taiyiLastStatusCall ?? 0;
    const now = Date.now();
    if (process.env.TAIYI_STATUS_DEBOUNCE !== "0" && now - last < debounceMs) { log.error("[taiyi] status 在 5s 内重复调用,跳过"); return; }
    (globalThis as any).__taiyiLastStatusCall = now;
    const slug = requireSlug(a);
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
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0] || undefined;
    const profile = resolveProfileFromArgs(a);
    const r = runWalkthrough(workspaceDir, { slug, profile });
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(formatWalkthroughPlain(r));
    if (!r.ok) process.exitCode = 1; return;
  },
  agent: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const role = positional[0] || "executor";
    const slug = positional[1];
    const r = taiyiAgent(workspaceDir, role, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  team: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiTeam(workspaceDir, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  ultrawork: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiUltrawork(workspaceDir, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
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
  ralph: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiRalph(workspaceDir, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  autopilot: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiAutopilot(workspaceDir, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  // ── New CLI handlers for commands removed from SLASH_ONLY ──
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
  "stop-mode": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0] || undefined;
    const force = a.includes("--force");
    const r = taiyiStopMode(workspaceDir, { slug, force });
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
  "review-check": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiReviewCheck(workspaceDir, slug, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  "review-loop": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiReviewLoop(workspaceDir, slug, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  step: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const r = taiyiStep(workspaceDir, slug);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
  },
  "commit-trailers": (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const subject = positional.slice(1).join(" ");
    const r = taiyiCommitTrailers(workspaceDir, slug, subject || undefined);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exitCode = 1; return;
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
  flow: (a) => {
    const [sub, ...rest] = a;
    const title = stripFlags(rest).join(" ").trim();
    if (sub === "feature") {
      if (!title) { log.error("用法: flow feature <title>"); process.exitCode = 1; return; }
      const r = taiyiFeature(workspaceDir, title);
      if (jsonMode) console.log(JSON.stringify(r, null, 2));
      else if ("text" in r && r.text) console.log(r.text);
      if (!r.ok) process.exitCode = 1; return;
      return;
    }
    if (sub === "bug") {
      if (!title) { log.error("用法: flow bug <title>"); process.exitCode = 1; return; }
      const r = taiyiBug(workspaceDir, title);
      if (jsonMode) console.log(JSON.stringify(r, null, 2));
      else if ("text" in r && r.text) console.log(r.text);
      if (!r.ok) process.exitCode = 1; return;
      return;
    }
    log.error("用法: flow feature <title> | flow bug <title>");
    process.exitCode = 1; return;
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
    process.exit(2);
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
      process.exit(result.ok ? 0 : 1);
    }
    if (sub === "status") {
      if (!slug) { log.error("用法: daemon status <slug>"); process.exitCode = 1; return; }
      const state = readDaemonState(taiyiRoot, slug);
      if (jsonMode) console.log(JSON.stringify(state, null, 2));
      else if (state) console.log(`daemon ${slug}: round=${state.round} active=${state.active}`);
      else log.error("daemon status: 未找到运行状态");
      process.exit(state ? 0 : 1);
    }
    log.error("用法: daemon run|status <slug>"); process.exitCode = 1; return;
  },
  "init-wizard": (a: string[]) => {
    const r = runInitWizard(workspaceDir);
    if (jsonMode) { r.then((result: unknown) => console.log(JSON.stringify(result, null, 2))).catch((err: unknown) => { log.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; }); return; }
    r.then((result: unknown) => console.log("已写入 .taiyi/config.json: " + JSON.stringify(result))).catch((err: unknown) => { log.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; });
  },
  "import": (a: string[]) => {
    const branch = stripFlags(a)[0];
    if (!branch) { log.error("用法: import <branch-name>"); process.exitCode = 1; return; }
    const r = importFromGitBranch(branch, workspaceDir);
    r.then(slug => { if (jsonMode) console.log(JSON.stringify({ slug }, null, 2)); else console.log("导入完成: " + slug); }).catch((err: unknown) => { log.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; });
  },
};

// ── Dispatch ──
function dispatch(cmd: string, rawCmd: string, args: string[]): void {
  try {
    switch (cmd) {
      case "help": case "--help": case "-h": usage(); break;
      default: {
        if (cmd && LEGACY_REDIRECT[cmd]) { log.error("[taiyi] \"" + cmd + "\" 已移除，请用 npx taiyi " + LEGACY_REDIRECT[cmd]); process.exitCode = 1; return; }
        if (rawCmd && SLASH_ONLY.has(rawCmd)) { const h = taiyiChatSlashOnlyHint(rawCmd); log.error(h.text); process.exit(2); }
        if (cmd && handlers[cmd]) { handlers[cmd]!(args); break; }
        usage(); process.exit(rawCmd ? 2 : 0);
      }
    }
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}
dispatch(cmd ?? "", rawCmd, args);
