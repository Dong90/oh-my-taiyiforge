#!/usr/bin/env node
import { WorkflowEngine } from "../core/workflow-engine.js";
import { buildDoctorJsonCompact } from "../core/doctor.js";
import { buildAuditJsonCompact } from "../core/workflow-audit.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolvePackageRoot, resolveTemplatesDir } from "../core/package-root.js";
import { resolveHumanForComplete } from "../core/gates/human-gate-config.js";
import { formatChangeListPlain, formatGuidePlain, formatPhaseProgressLine, formatStatusCompact, formatStatusPlain } from "../core/format-guide.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { isChangeAborted, isWorkflowCompleted, completedWorkflowMessage } from "../core/change-status.js";
import { resolveActiveSlug, slugifyTitle } from "../core/active-slug.js";
import { resolveAutoHarness } from "../core/resolve-auto-harness.js";
import { formatChangeNotFound, parseProfileFlag } from "../core/cli-hints.js";
import { resolveDefaultProfile } from "../core/project-config.js";
import type { ChangeProfile, PhaseId } from "../core/types.js";
import {
  taiyiArchive, taiyiAudit, taiyiCancel, taiyiDoctor, taiyiHandoff,
  taiyiHarness, taiyiHealth, taiyiList, taiyiMilestone, taiyiNext,
  taiyiResume, taiyiStatus, taiyiCiVerify, taiyiCiPlatform, taiyiCiPrompt,
  taiyiToken, taiyiWrite, taiyiChatSlashOnlyHint,
} from "../plugin/handlers.js";
import type { CiPlatformId } from "../core/ci-platform.js";
import { parseRepeatCount } from "../core/repeat-parse.js";
import { formatArchivePlain } from "../core/format-integration.js";
import {
  formatAgentLoopProtocol, formatLoopResultPlain,
  runContinueRepeat, runLoopUntilComplete,
} from "../core/loop-runner.js";
import { SLASH_ONLY, LEGACY_REDIRECT } from "../core/command-registry.js";

const workspaceDir = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspaceDir);
const jsonMode = process.argv.includes("--json");
const compactMode = process.argv.includes("--compact");

function usage(): void {
  console.log(`TaiyiForge

日常:  new <t> [--profile p]  |  status [slug]  |  write [slug]
       continue [slug] [xN]   |  apply [slug]   |  loop [slug] [xN]
       list [--all]            |  milestone       |  archive [slug]
       cancel [slug]           |  handoff [slug]  |  resume [slug]

排查:  doctor [--strict] [--json]  |  audit [slug]  |  verify [slug]
       token status|record|compress  |  ci platform|verify|prompt
       health [slug]

其他:  /taiyi:commit  /taiyi:ship  /taiyi:land  /taiyi:ralph  /taiyi:team
       /taiyi:mode ...  /taiyi:workflow ...  /taiyi:diagram ...

Profile: full | api | ui | lite | spike | micro | nano
Legacy: init→new · done→continue · next→status · pause→handoff
`);
}

const CLI_ALIASES: Record<string, string> = { pause: "handoff" };
function normalizeCliCommand(raw?: string): string | undefined {
  if (!raw) return undefined;
  return CLI_ALIASES[raw] ?? raw;
}

const templatesDir = resolveTemplatesDir(import.meta.url);
const engine = new WorkflowEngine(taiyiRoot, templatesDir);
const argv = process.argv.slice(2).filter((a) => a !== "--json" && a !== "--compact");
const [rawCmd, ...args] = argv;
const cmd = normalizeCliCommand(rawCmd);

function resolveProfileFromArgs(argv: string[]): ChangeProfile | undefined {
  const parsed = parseProfileFlag(argv);
  if (!parsed.ok) { console.error(parsed.error); process.exit(1); }
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
  if (!r.ok) { console.error(r.error); process.exit(1); }
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
  if (state && isWorkflowCompleted(state)) { console.log("✓ " + phaseId + " 完成 → /taiyi:archive"); return; }
  console.log("✓ " + phaseId + " 过关");
  const r = taiyiNext(workspaceDir, slug, true);
  if (r.ok && "text" in r && r.text) console.log("\n" + r.text);
  else console.log("→ /taiyi:continue 或 /taiyi:status");
}

function printDoctor(doctorArgs: string[]): void {
  const strictWorkspace = doctorArgs.includes("--strict-workspace");
  const r = taiyiDoctor(undefined, workspaceDir, { strictWorkspace });
  if (jsonMode) { const p = compactMode ? buildDoctorJsonCompact(r) : r; console.log(JSON.stringify(p, null, 2)); if (!r.ok) process.exit(1); return; }
  if (compactMode) {
    console.log("doctor " + (r.ok ? "PASS" : "FAIL") + " v" + r.report.version);
    const all = [...r.report.checks, ...(r.report.workspaceChecks ?? [])];
    const failed = all.filter(c => !c.ok);
    if (failed.length === 0) console.log("checks=" + all.length + " ok");
    else { for (const c of failed.slice(0, 8)) console.log("✗ " + c.id + ": " + c.detail); if (failed.length > 8) console.log("… +" + (failed.length - 8) + " more"); }
    if (!r.ok) process.exit(1); return;
  }
  console.log("TaiyiForge doctor v" + r.report.version + " — " + (r.ok ? "PASS" : "FAIL") + "\n");
  console.log("安装:");
  for (const c of r.report.checks) console.log((c.ok ? "✓" : "✗") + " " + c.id + ": " + c.detail);
  if (r.report.workspaceChecks?.length) { console.log("\n工作区流程:"); for (const c of r.report.workspaceChecks) console.log((c.ok ? "✓" : "✗") + " " + c.id + ": " + c.detail); }
  if (!r.ok) { process.exit(1); }
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
  if (!r.ok) process.exit(1);
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
    if (!r.ok) process.exit(1);
  },
  health: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const r = taiyiHealth(workspaceDir, positional[0]);
    if (!r.ok) { console.error("error" in r ? r.error : "health failed"); process.exit(1); }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
  },
  verify: () => runVerifyCommand(args),
  list: (a) => {
    const r = taiyiList(workspaceDir, { includeAll: a.includes("--all"), includeArchived: a.includes("--archived") });
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(formatChangeListPlain(r.changes));
  },
  milestone: (a) => {
    const r = taiyiMilestone(workspaceDir, { includeArchived: a.includes("--all") || a.includes("--archived") }, !jsonMode);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    if (jsonMode) console.log(JSON.stringify(r.report, null, 2));
    else console.log(r.text);
  },
  new: (a) => {
    const title = stripFlags(a).join(" ").trim();
    if (!title) { console.error("用法: new <标题> [--profile full|lite|api|micro|nano|spike|ui]"); process.exit(1); }
    const slug = slugifyTitle(title);
    try {
      const result = engine.initChange(slug, { title, templatesDir, profile: resolveProfileFromArgs(a) ?? resolveDefaultProfile(workspaceDir), strictDev: a.includes("--strict-dev"), autoHarness: resolveAutoHarness(a, false), force: a.includes("--force") });
      if (jsonMode) console.log(JSON.stringify(result, null, 2));
      else { const guide = buildPhaseGuide(taiyiRoot, slug, result, workspaceDir); console.log("变更: " + slug + "\n"); console.log(formatGuidePlain(guide)); }
    } catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); }
  },
  cancel: (a) => {
    const removeDir = a.includes("--remove-dir");
    const slug = requireSlug(stripFlags(a));
    const result = taiyiCancel(workspaceDir, slug, { removeDir });
    if (!result.ok) { console.error(result.error); process.exit(1); }
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else { console.log("已取消变更: " + result.slug); if (result.removed) console.log("变更目录已删除。"); }
  },
  continue: (a) => {
    const { argv: continueArgs, approver } = extractApprover(a);
    const { slug, times } = requireSlugAndRepeat(continueArgs);
    if (times > 1) { const result = runContinueRepeat(engine, workspaceDir, taiyiRoot, slug, times); if (jsonMode) console.log(JSON.stringify(result, null, 2)); else console.log(formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir)); process.exit(result.ok ? 0 : 1); }
    const state = engine.getState(slug);
    if (!state) { console.error(formatChangeNotFound(slug)); process.exit(1); }
    if (isWorkflowCompleted(state)) { console.log("变更 " + slug + " 已完成 → /taiyi:archive"); return; }
    if (isChangeAborted(state)) { console.error("变更 " + slug + " 已取消"); process.exit(1); }
    const phaseId = state.currentPhase as PhaseId;
    const attempt = tryCompletePhase(slug, { approver });
    if (attempt.ok) { printCompleteSuccess(slug, phaseId); return; }
    const r = taiyiNext(workspaceDir, slug, !jsonMode);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    if (jsonMode) console.log(JSON.stringify({ blocked: (attempt as any).error, guide: r.guide }, null, 2));
    else { if (r.guide) console.log(formatPhaseProgressLine(r.guide)); console.log("\n未过关: " + (attempt as any).error + "\n"); if ("text" in r && r.text) console.log(r.text); }
    process.exit(1);
  },
  apply: (a) => {
    const { slug, times } = requireSlugAndRepeat(a);
    const state = engine.getState(slug);
    if (!state) { console.error(formatChangeNotFound(slug)); process.exit(1); }
    if (isWorkflowCompleted(state)) { console.log("变更 " + slug + " 已完成 → /taiyi:archive"); return; }
    if (isChangeAborted(state)) { console.error("变更 " + slug + " 已取消"); process.exit(1); }
    if (state.currentPhase !== "dev" && state.currentPhase !== "test") { console.error("当前阶段为「" + state.currentPhase + "」。apply 用于 dev/test"); process.exit(1); }
    const h = taiyiHarness(workspaceDir, slug, !jsonMode);
    if (!h.ok) { console.error(h.error); process.exit(1); }
    for (let i = 1; i <= times; i++) {
      if (!jsonMode) { if (times === 1) console.log("=== /taiyi:apply（" + state.currentPhase + "）===\n说明: 只输出清单，实现后 /taiyi:continue\n"); else console.log("=== /taiyi:apply " + i + "/" + times + "（" + state.currentPhase + "）===\n"); }
      if (!jsonMode && "text" in h && h.text) { console.log(h.text); if (i < times) console.log(""); }
      else if (jsonMode) console.log(JSON.stringify({ round: i, total: times, ...h }, null, 2));
    }
  },
  loop: (a) => {
    const { positional, times, timesExplicit } = parseRepeatCount(stripFlags(a));
    const r = resolveActiveSlug(taiyiRoot, positional[0]);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    const result = runLoopUntilComplete(engine, workspaceDir, taiyiRoot, r.slug, timesExplicit ? times : undefined);
    if (jsonMode) console.log(JSON.stringify(result, null, 2));
    else { console.log(formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir)); if (!result.ok) console.log("\n" + formatAgentLoopProtocol(r.slug, result.loopRound, result.maxRounds)); }
    process.exit(result.ok ? 0 : 1);
  },
  status: (a) => {
    const debounceMs = 5000;
    const last = (globalThis as any).__taiyiLastStatusCall ?? 0;
    const now = Date.now();
    if (process.env.TAIYI_STATUS_DEBOUNCE !== "0" && now - last < debounceMs) { console.error("[taiyi] status 在 5s 内重复调用,跳过"); return; }
    (globalThis as any).__taiyiLastStatusCall = now;
    const slug = requireSlug(a);
    const r = taiyiStatus(workspaceDir, slug);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    if (jsonMode) { const payload = compactMode ? { engineTruth: r.engineTruth, statusLine: formatPhaseProgressLine(r.guide) } : { engineTruth: r.engineTruth, state: r.state, guide: r.guide, openspec: r.openspec }; console.log(JSON.stringify(payload, null, 2)); }
    else if (compactMode) console.log(formatStatusCompact(r.guide));
    else console.log(formatStatusPlain(r.guide));
  },
  handoff: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const slug = positional[0];
    const note = positional.slice(1).join(" ").trim() || undefined;
    const r = taiyiHandoff(workspaceDir, slug, note);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("noop" in r && r.noop && r.message) console.log(r.message);
    else { console.log("已写入: " + r.path); console.log("恢复: /taiyi:status " + r.slug); }
  },
  resume: (a) => {
    const slug = stripFlags(a)[0];
    const r = taiyiResume(workspaceDir, slug, !jsonMode);
    if (!r.ok) { console.error(r.error); process.exit(1); }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(r.text);
  },
  archive: (a) => {
    const slug = requireSlug(a);
    const r = taiyiArchive(workspaceDir, slug, { skipSpecs: a.includes("--skip-specs") });
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if (r.ok) console.log(formatArchivePlain(slug, r));
    else console.error(formatArchivePlain(slug, r));
    if (!r.ok) process.exit(1);
  },
  ci: (a) => {
    const [sub, ...rest] = a;
    if (sub === "verify") { runVerifyCommand(rest); return; }
    if (sub === "platform") { const platform = rest[0] as CiPlatformId; if (!platform || !["opencode", "claude", "codex", "cursor"].includes(platform)) { console.error("用法: ci platform <opencode|claude|codex|cursor>"); process.exit(1); } const r = taiyiCiPlatform(resolvePackageRoot(import.meta.url), platform, !jsonMode); if ("text" in r && r.text) console.log(r.text); if (!r.ok) process.exit(1); return; }
    if (sub === "prompt") { const slug = rest[0]; if (!slug) { console.error("用法: ci prompt <slug>"); process.exit(1); } const r = taiyiCiPrompt(workspaceDir, slug); if (!r.ok) { console.error(r.error); process.exit(1); } console.log(jsonMode ? JSON.stringify(r, null, 2) : "CI prompt: " + r.promptFile); return; }
    console.error("用法: ci verify | ci platform | ci prompt"); process.exit(1);
  },
  token: (a) => {
    const [sub, ...tokenArgs] = a;
    const phaseIdx = tokenArgs.indexOf("--phase"); const phase = (phaseIdx >= 0 ? tokenArgs[phaseIdx + 1] : undefined) as PhaseId | undefined;
    const { positional } = parseRepeatCount(stripFlags(tokenArgs));
    const effectiveSub = sub === "status" || !sub ? ("status" as const) : sub === "record" || sub === "scan" || sub === "compress" ? sub : null;
    if (!effectiveSub) { console.error("用法: token status|record|scan|compress"); process.exit(1); }
    let slug: string | undefined; let tokens: number | undefined;
    if (effectiveSub === "record") { if (positional.length >= 2) { slug = positional[0]; tokens = Number(positional[1]); } else if (positional.length === 1) { const n = Number(positional[0]); if (Number.isFinite(n)) tokens = n; else slug = positional[0]; } }
    else if (positional[0]) slug = positional[0];
    const r = taiyiToken(workspaceDir, effectiveSub, { slug, tokens, phase });
    if (!r.ok) { console.error("error" in r ? r.error : "token failed"); process.exit(1); }
    if ("text" in r && r.text) console.log(r.text);
  },
  write: (a) => {
    const { positional } = parseRepeatCount(stripFlags(a));
    const r = taiyiWrite(workspaceDir, positional[0], !jsonMode);
    if (!r.ok) { console.error("error" in r ? r.error : r.text); process.exit(1); }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
  },
};

// ── Dispatch ──
switch (cmd) {
  case "help": case "--help": case "-h": usage(); break;
  default: {
    if (cmd && LEGACY_REDIRECT[cmd]) { console.error("[taiyi] \"" + cmd + "\" 已移除，请用 npx taiyi " + LEGACY_REDIRECT[cmd]); process.exit(1); }
    if (rawCmd && SLASH_ONLY.has(rawCmd)) { const h = taiyiChatSlashOnlyHint(rawCmd); console.error(h.text); process.exit(2); }
    if (cmd && handlers[cmd]) { handlers[cmd]!(args); break; }
    usage(); process.exit(rawCmd ? 2 : 0);
  }
}
