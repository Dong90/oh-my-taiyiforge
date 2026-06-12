#!/usr/bin/env node
import { WorkflowEngine } from "../core/workflow-engine.js";
import { buildDoctorJsonCompact } from "../core/doctor.js";
import { buildAuditJsonCompact } from "../core/workflow-audit.js";
import { runBrowserSmoke } from "../core/browser-smoke.js";
import { listPhases } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolvePackageRoot, resolveTemplatesDir } from "../core/package-root.js";
import { installProjectWrapper } from "../install/sync-project-wrapper.js";
import { resolveHumanForComplete } from "../core/gates/human-gate-config.js";
import { formatChangeListPlain, formatGuidePlain, formatPhaseProgressLine, formatStatusCompact, formatStatusPlain } from "../core/format-guide.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { isChangeAborted, isWorkflowCompleted, completedWorkflowMessage } from "../core/change-status.js";
import { resolveActiveSlug, resolveChangeSlug, slugifyTitle } from "../core/active-slug.js";
import {
  evaluateCommitTrailers,
  suggestCommitMessage,
} from "../core/gates/commit-trailer.js";
import { resolveAutoHarness } from "../core/resolve-auto-harness.js";
import { formatChangeNotFound, parseProfileFlag } from "../core/cli-hints.js";
import { resolveDefaultProfile } from "../core/project-config.js";
import type { ChangeProfile, PhaseId } from "../core/types.js";
import {
  taiyiArchive,
  taiyiCancel,
  taiyiAssess,
  taiyiComplete,
  taiyiDoctor,
  taiyiHandoff,
  taiyiGuide,
  taiyiList,
  taiyiMarkAux,
  taiyiNext,
  taiyiStatus,
  taiyiSyncOpenspec,
  taiyiWalkthrough,
  taiyiHarness,
  taiyiHarnessCheck,
  taiyiAudit,
  taiyiHealth,
  taiyiCiVerify,
  taiyiCiPlatform,
  taiyiCiPrompt,
  taiyiReviewCheck,
  taiyiReviewLoop,
  taiyiRalph,
  taiyiAutopilot,
  taiyiTeam,
  taiyiUltrawork,
  taiyiAgent,
  taiyiWrite,
  taiyiPhaseWrite,
  taiyiFeature,
  taiyiBug,
  taiyiFlow,
  taiyiMvp,
  taiyiMicro,
  taiyiNano,
  taiyiService,
  taiyiDesignSystem,
  taiyiCiScenario,
  taiyiResume,
  taiyiSlashOnlyHint,
  taiyiChatSlashOnlyHint,
  taiyiStep,
  taiyiStopMode,
  taiyiTrimAhead,
  taiyiPrune,
  taiyiModes,
  taiyiRemember,
  taiyiKeyword,
  taiyiWorkflowSkill,
  taiyiToken,
} from "../plugin/handlers.js";
import type { CiPlatformId } from "../core/ci-platform.js";
import { parseRepeatCount } from "../core/repeat-parse.js";
import { formatArchivePlain, formatSyncOpenspecPlain } from "../core/format-integration.js";
import {
  formatAgentLoopProtocol,
  formatLoopResultPlain,
  runContinueRepeat,
  runLoopUntilComplete,
} from "../core/loop-runner.js";
import { formatDaemonResultPlain, readDaemonState, runDaemonLoop } from "../core/daemon-runner.js";

const workspaceDir = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspaceDir);
const jsonMode = process.argv.includes("--json");
const compactMode = process.argv.includes("--compact");

function usage(): void {
  console.log(`TaiyiForge (oh-my-taiyiforge)

用法:
  npm run taiyi -- doctor [--strict-workspace] [--json] [--compact]
  npm run taiyi -- audit [slug] [--json] [--compact]
  npm run taiyi -- list                     列出 .taiyi/changes/ 下所有变更
  npm run taiyi -- init <slug> [--profile api|lite|ui] [--strict-dev] [--auto] [--force] [--json]
  npm run taiyi -- harness <slug>              全自动编排清单（铁三角→辅助→主流程）
  npm run taiyi -- harness-check <slug> <key>  铁三角步骤打卡（auto 模式）
  npm run taiyi -- new <标题>              /taiyi:new — 自动 slug（默认手动；--auto 全自动）
  npm run taiyi -- cancel [slug]           /taiyi:cancel — 取消进行中变更
  npm run taiyi -- handoff [slug] [备注]   /taiyi:handoff — 写 HANDOFF.md（跨会话恢复）
  npm run taiyi -- commit-trailers [slug] [subject]  legacy；聊天用 /taiyi:commit
  npm run taiyi -- status [slug] [--json] [--compact]   Agent 默认 --json --compact
  npm run taiyi -- continue [slug] [xN]   → /taiyi:continue [xN]
  npm run taiyi -- apply [slug] [xN]        → /taiyi:apply [xN]
  npm run taiyi -- loop [slug] [xN]         → /taiyi:loop — 循环 continue 直到完成或阻塞
  npm run taiyi -- archive [slug]         /taiyi:archive
  npm run taiyi -- next [slug]             仅查看下一步（legacy）
  npm run taiyi -- done [slug]             强制过关当前阶段（legacy）
  npm run taiyi -- guide <slug> [--json]    详细 guide（默认 JSON）
  npm run taiyi -- status <slug> [--json]
  npm run taiyi -- assess <slug>
  npm run taiyi -- mark-aux <slug> <skill>
  npm run taiyi -- complete <slug> <phase> [--approver 名字]
  npm run taiyi -- sync [slug]              /taiyi:sync（别名 sync-openspec）
  npm run taiyi -- archive <slug>
  npm run taiyi -- walkthrough [--slug name] [--profile api|lite]
  npm run taiyi -- browser-smoke [--json]     → /taiyi:browser-smoke — Playwright 浏览器冒烟
  npm run taiyi -- audit [slug] [--json] [--compact]   /taiyi:audit — 流程/交付排查
  npm run taiyi -- health [slug]            /taiyi:health — 输出 health Agent 协议（须 Skill 写报告 + mark-aux）
  npm run taiyi -- verify [slug] [--require-complete]   /taiyi:verify — PR/CI 工件门禁
  npm run taiyi -- ci verify [--slug x] [--require-complete]   （verify 别名，供 GitHub Actions）
  npm run taiyi -- ci platform <opencode|claude|codex|cursor>
  npm run taiyi -- ci prompt <slug>          生成 CI Agent 推进 prompt 文件
  npm run taiyi -- token status [slug]       → /taiyi:token status
  npm run taiyi -- token record <slug> <n>   → /taiyi:token record …
  npm run taiyi -- token scan <slug>         → /taiyi:token scan
  npm run taiyi -- token compress <slug>     → /taiyi:token compress
  npm run taiyi -- review-check <slug>       → 机器审查 REVIEW.md（不计轮次）
  npm run taiyi -- review-loop [slug]        → /taiyi:review-loop — 不过则继续修再跑
  npm run taiyi -- ralph [slug]              → /taiyi:ralph — 验证命令不过则修到绿
  npm run taiyi -- autopilot [slug]          → /taiyi:autopilot — 九阶段全自动指引
  npm run taiyi -- team [slug]               → /taiyi:team — plan/exec/verify/fix 泳道
  npm run taiyi -- ultrawork [slug]          → /taiyi:ultrawork — task/dev 并行切片
  npm run taiyi -- agent <role|list> [slug]  → /taiyi:agent — 专 Agent 角色协议
  npm run taiyi -- plan|ralplan|ultraqa|… [slug]  → workflow skills（见 stop-mode / modes）
  npm run taiyi -- step [slug] [--mode ralph|autopilot|…]  → /taiyi:step — OMC 式单步驱动
  npm run taiyi -- daemon run <slug> [--engine-only] [--dry-run] [--force]
                        无人 Agent 闭环（引擎 step + 可选 codex/claude/cursor Agent）
  npm run taiyi -- daemon status [slug]           查看 daemon 运行时状态
  npm run taiyi -- modes                    → /taiyi:modes — 列出活跃模式
  npm run taiyi -- remember [note]          → /taiyi:remember — 项目记忆
  npm run taiyi -- write [slug]              → /taiyi:write — 写当前阶段工件
  npm run taiyi -- change|requirement|… [slug]  legacy CLI；聊天用 /taiyi:write
  npm run taiyi -- list [--all] [--archived]   默认仅活跃；--archived 仅 archive/；--all 含 completed/aborted
  npm run taiyi -- resume [slug]               /taiyi:resume — HANDOFF + status
  npm run taiyi -- prune [--dry-run] [--aborted]  清理孤儿目录 + runtime
  npm run taiyi -- trim-ahead <slug>           删除超前阶段工件
  npm run taiyi -- sync-wrapper                消费方 scripts/taiyi-forge.sh → shim
  npm run taiyi -- help                        用法（exit 0）
  npm run taiyi -- ls|check|pause|n|go|ok|run   legacy 别名 → list|harness|handoff|next|done|walkthrough
  npm run taiyi -- feature [标题] [--create]   → /taiyi:feature — 新功能场景（--create 自动 new）
  npm run taiyi -- bug [标题] [--create]       → /taiyi:bug — lite 修 bug（--create 自动 new）
  npm run taiyi -- mvp|micro|nano|service|design-system [标题] [--create]  → 场景 playbook
  npm run taiyi -- flow [场景] [标题]          → 场景选型或展开 playbook

Profile: full | api | ui | lite | spike（MVP 四阶段）| micro（个人三阶段）
Token: 见 docs/taiyi/token-budget.yaml · TAIYI_TOKEN_BUDGET / TAIYI_TOKEN_ENFORCE
CI: 见 docs/ci/README.md 与 examples/ci/github-actions/

仅聊天斜杠（无 shell/CLI 实现，请用 /taiyi:<verb> 加载 Skill）:
  explore · flow · tdd · security · e2e · ui-test · release · ship · land · commit
Legacy 别名: ls→list · n/go→next · done/ok→done · check→harness · pause→handoff
`);
}

const CLI_ALIASES: Record<string, string> = {
  ls: "list",
  n: "next",
  go: "next",
  ok: "done",
  check: "harness",
  pause: "handoff",
  run: "walkthrough",
};

const SLASH_ONLY_COMMANDS = new Set([
  "explore",
  "full-flow",
  "tdd",
  "security",
  "e2e",
  "ui-test",
  "release",
  "preflight",
  "sp",
  "gstack",
  "diagram-pipeline",
  "diagram-c4",
  "diagram-arch",
  "diagram-flow",
  "diagram-render",
]);

function normalizeCliCommand(raw?: string): string | undefined {
  if (!raw) return undefined;
  return CLI_ALIASES[raw] ?? raw;
}

const templatesDir = resolveTemplatesDir(import.meta.url);
const engine = new WorkflowEngine(taiyiRoot, templatesDir);
const argv = process.argv.slice(2).filter((a) => a !== "--json" && a !== "--compact");
const [rawCmd, ...args] = argv;
const cmd = normalizeCliCommand(rawCmd);

const WORKFLOW_SKILL_VERBS = new Set([
  "plan",
  "ralplan",
  "ultraqa",
  "visual-verdict",
  "deep-interview",
  "ai-slop-cleaner",
  "ecomode",
  "ccg",
  "sciomc",
  "deepinit",
  "external-context",
]);

const PHASE_WRITE_VERBS = new Set([
  "change",
  "requirement",
  "design",
  "ui-design",
  "task",
  "dev",
  "test",
  "review",
  "integration",
]);

function printHandlerResult(r: { ok: boolean; text?: string; error?: string }, exitOnFail = false): void {
  if (!r.ok) {
    if ("text" in r && r.text) console.error(r.text);
    else if ("error" in r && r.error) console.error(r.error);
    if (exitOnFail) process.exit(1);
    return;
  }
  if (jsonMode) console.log(JSON.stringify(r, null, 2));
  else if ("text" in r && r.text) console.log(r.text);
}

function resolveProfileFromArgs(argv: string[]): ChangeProfile | undefined {
  const parsed = parseProfileFlag(argv);
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exit(1);
  }
  return parsed.profile;
}

function extractApprover(argv: string[]): { argv: string[]; approver?: string } {
  const out: string[] = [];
  let approver: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--approver" && argv[i + 1]) {
      approver = argv[++i];
      continue;
    }
    out.push(a);
  }
  return { argv: out, approver };
}

function stripFlags(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--profile" || a === "--approver") {
      i++;
      continue;
    }
    if (a.startsWith("--")) continue;
    out.push(a);
  }
  return out;
}

function parseOptionalSlug(argv: string[]): string | undefined {
  const slugIdx = argv.indexOf("--slug");
  if (slugIdx >= 0 && argv[slugIdx + 1]) return argv[slugIdx + 1];
  const { positional } = parseRepeatCount(stripFlags(argv));
  return positional[0];
}

function runVerifyCommand(verifyArgs: string[]): void {
  const r = taiyiCiVerify(workspaceDir, {
    slug: parseOptionalSlug(verifyArgs),
    requireComplete: verifyArgs.includes("--require-complete"),
    plain: !jsonMode,
  });
  if (jsonMode) console.log(JSON.stringify(r.report, null, 2));
  else if ("text" in r && r.text) console.log(r.text);
  if (!r.ok) process.exit(1);
}

function requireSlug(argv: string[]): string {
  return requireSlugAndRepeat(argv).slug;
}

function requireSlugAndRepeat(argv: string[]): { slug: string; times: number } {
  const { positional, times } = parseRepeatCount(stripFlags(argv));
  const r = resolveActiveSlug(taiyiRoot, positional[0]);
  if (!r.ok) {
    console.error(r.error);
    process.exit(1);
  }
  return { slug: r.slug, times };
}

function tryCompletePhase(
  slug: string,
  options?: { approver?: string; phaseId?: PhaseId },
): { ok: true } | { ok: false; error: string } {
  const state = engine.getState(slug);
  if (!state) return { ok: false, error: formatChangeNotFound(slug) };
  if (isWorkflowCompleted(state)) return { ok: true };

  const phaseId = options?.phaseId ?? (state.currentPhase as PhaseId);
  const humanResolved = resolveHumanForComplete(phaseId, options?.approver);
  if (!humanResolved.ok) {
    return {
      ok: false,
      error: humanResolved.error.includes("approver")
        ? `阶段 ${phaseId} 需人工审批。使用 --approver "你的名字"，例如: /taiyi:continue ${slug} ${phaseId} --approver "你的名字"`
        : humanResolved.error,
    };
  }

  const result = engine.completePhase(
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
    humanResolved.allowAutoHuman ? { allowAutoHuman: true } : undefined,
  );
  if (!result.ok) return { ok: false, error: result.error ?? "complete failed" };
  return { ok: true };
}

function printCompleteSuccess(slug: string, phaseId: PhaseId): void {
  const state = engine.getState(slug);
  if (jsonMode) {
    console.log(JSON.stringify(state, null, 2));
    return;
  }
  if (state && isWorkflowCompleted(state)) {
    console.log(`✓ ${phaseId} 完成 → ${completedWorkflowMessage(state)}\n→ /taiyi:archive`);
    return;
  }
  console.log(`✓ ${phaseId} 过关`);
  const r = taiyiNext(workspaceDir, slug, true);
  if (r.ok && "text" in r && r.text) {
    console.log("");
    console.log(r.text);
  } else {
    console.log(`→ /taiyi:continue 或 /taiyi:status`);
  }
}

function completeCurrentPhase(slug: string, phaseId: PhaseId, approver?: string): void {
  const r = tryCompletePhase(slug, { approver, phaseId });
  if (!r.ok) {
    console.error(r.error);
    process.exit(1);
  }
  printCompleteSuccess(slug, phaseId);
}

function printDoctor(): void {
  const strictWorkspace = args.includes("--strict-workspace");
  const r = taiyiDoctor(undefined, workspaceDir, { strictWorkspace });
  if (jsonMode) {
    const payload = compactMode ? buildDoctorJsonCompact(r) : r;
    console.log(JSON.stringify(payload, null, 2));
    if (!r.ok) process.exit(1);
    return;
  }
  if (compactMode) {
    console.log(`doctor ${r.ok ? "PASS" : "FAIL"} v${r.report.version}`);
    const all = [...r.report.checks, ...(r.report.workspaceChecks ?? [])];
    const failed = all.filter((c) => !c.ok);
    if (failed.length === 0) {
      console.log(`checks=${all.length} ok`);
    } else {
      for (const c of failed.slice(0, 8)) console.log(`✗ ${c.id}: ${c.detail}`);
      if (failed.length > 8) console.log(`… +${failed.length - 8} more`);
    }
    if (!r.ok) process.exit(1);
    return;
  }
  console.log(`TaiyiForge doctor v${r.report.version} — ${r.ok ? "PASS" : "FAIL"}\n`);
  console.log("安装:");
  for (const c of r.report.checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
  }
  if (r.report.workspaceChecks?.length) {
    console.log("\n工作区流程:");
    for (const c of r.report.workspaceChecks) {
      console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
    }
  }
  if (!r.ok) {
    if (!r.report.ok) {
      console.log("\n修复: npx taiyi-forge-install --all");
    } else if (strictWorkspace) {
      console.log("\n--strict-workspace: 工作区 blocker 未通过");
    }
    process.exit(1);
  }
  if (r.report.workspaceOk === false && !strictWorkspace) {
    console.log("\n工作区提示: /taiyi:status · /taiyi:audit · /taiyi:handoff");
  }
}

switch (cmd) {
  case "help":
  case "--help":
  case "-h":
    usage();
    break;
  case "doctor":
    printDoctor();
    break;
  case "sync-wrapper": {
    const pkgRoot = resolvePackageRoot(import.meta.url);
    const r = installProjectWrapper(workspaceDir, pkgRoot);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(`[taiyi-forge] ${r.action}: ${r.detail ?? r.path}`);
    if (r.action === "failed") process.exit(1);
    break;
  }
  case "audit": {
    const { positional } = parseRepeatCount(stripFlags(args));
    const r = taiyiAudit(workspaceDir, {
      slug: positional[0],
      plain: !jsonMode,
      compact: compactMode,
    });
    if (jsonMode) {
      const payload = compactMode ? buildAuditJsonCompact(r.report) : r.report;
      console.log(JSON.stringify(payload, null, 2));
    } else if ("text" in r && r.text) console.log(r.text);
    if (!r.ok) process.exit(1);
    break;
  }
  case "health": {
    const { positional } = parseRepeatCount(stripFlags(args));
    const r = taiyiHealth(workspaceDir, positional[0]);
    if (!r.ok) {
      console.error("error" in r ? r.error : "health failed");
      process.exit(1);
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    break;
  }
  case "verify":
    runVerifyCommand(args);
    break;
  case "list": {
    const listOpts = {
      includeAll: args.includes("--all"),
      includeArchived: args.includes("--archived"),
    };
    const r = taiyiList(workspaceDir, listOpts);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(formatChangeListPlain(r.changes));
    break;
  }
  case "resume": {
    const slug = stripFlags(args)[0];
    const r = taiyiResume(workspaceDir, slug, !jsonMode);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(r.text);
    break;
  }
  case "ship":
  case "land":
  case "commit": {
    const r = taiyiSlashOnlyHint(cmd as "ship" | "land" | "commit");
    console.error(r.text);
    process.exit(2);
    break;
  }
  case "init": {
    const slug = args[0];
    if (!slug) {
      console.error("缺少 slug");
      process.exit(1);
    }
    let title: string | undefined;
    const titleIdx = args.indexOf("--title");
    if (titleIdx >= 0) title = args[titleIdx + 1];
    try {
      const result = engine.initChange(slug, {
        title,
        templatesDir,
        profile: resolveProfileFromArgs(args) ?? resolveDefaultProfile(workspaceDir),
        strictDev: args.includes("--strict-dev"),
        autoHarness: resolveAutoHarness(args, false),
        force: args.includes("--force"),
      });
      if (jsonMode) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const guide = buildPhaseGuide(taiyiRoot, slug, result, workspaceDir);
        console.log(formatGuidePlain(guide));
      }
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
    break;
  }
  case "new": {
    const title = stripFlags(args).join(" ").trim();
    if (!title) {
      console.error("用法: new <标题> [--profile api|lite]");
      process.exit(1);
    }
    const slug = slugifyTitle(title);
    try {
      const result = engine.initChange(slug, {
        title,
        templatesDir,
        profile: resolveProfileFromArgs(args) ?? resolveDefaultProfile(workspaceDir),
        strictDev: args.includes("--strict-dev"),
        autoHarness: resolveAutoHarness(args, false),
        force: args.includes("--force"),
      });
      if (jsonMode) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const guide = buildPhaseGuide(taiyiRoot, slug, result, workspaceDir);
        console.log(`变更: ${slug}\n`);
        console.log(formatGuidePlain(guide));
      }
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exit(1);
    }
    break;
  }
  case "cancel": {
    const removeDir = args.includes("--remove-dir");
    const slug = requireSlug(stripFlags(args));
    const result = taiyiCancel(workspaceDir, slug, { removeDir });
    if (!result.ok) {
      console.error(result.error);
      process.exit(1);
    }
    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`已取消变更: ${result.slug}`);
      if (result.removed) {
        console.log("变更目录已删除。");
      } else {
        console.log("目录仍保留于 .taiyi/changes/（--remove-dir 可删除；默认 list 不展示 aborted）。");
      }
    }
    break;
  }
  case "continue": {
    const { argv: continueArgs, approver } = extractApprover(args);
    const { slug, times } = requireSlugAndRepeat(continueArgs);
    if (times > 1) {
      const result = runContinueRepeat(engine, workspaceDir, taiyiRoot, slug, times);
      if (jsonMode) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir));
      }
      process.exit(result.ok ? 0 : 1);
    }
    const state = engine.getState(slug);
    if (!state) {
      console.error(formatChangeNotFound(slug));
      process.exit(1);
    }
    if (isWorkflowCompleted(state)) {
      console.log(`变更 ${slug} 已完成 → /taiyi:archive`);
      break;
    }
    if (isChangeAborted(state)) {
      console.error(`变更 ${slug} 已取消。请 /taiyi:new 或指定其他 slug。`);
      process.exit(1);
    }
    const phaseId = state.currentPhase as PhaseId;
    const attempt = tryCompletePhase(slug, { approver });
    if (attempt.ok) {
      printCompleteSuccess(slug, phaseId);
      break;
    }
    const r = taiyiNext(workspaceDir, slug, !jsonMode);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, blocked: attempt.error, guide: r.guide }, null, 2));
    } else {
      if (r.guide) console.log(formatPhaseProgressLine(r.guide));
      console.log(`\n尚未过关: ${attempt.error}\n`);
      if ("text" in r && r.text) console.log(r.text);
      console.log("\n提示: /taiyi:status 查看完整进度");
    }
    process.exit(1);
  }
  case "apply": {
    const { slug, times } = requireSlugAndRepeat(args);
    const state = engine.getState(slug);
    if (!state) {
      console.error(formatChangeNotFound(slug));
      process.exit(1);
    }
    if (isWorkflowCompleted(state)) {
      console.log(`变更 ${slug} 已完成 → /taiyi:archive`);
      break;
    }
    if (isChangeAborted(state)) {
      console.error(`变更 ${slug} 已取消。请 /taiyi:new 或指定其他 slug。`);
      process.exit(1);
    }
    const phase = state.currentPhase;
    if (phase !== "dev" && phase !== "test") {
      console.error(
        `当前阶段为「${phase}」。/taiyi:apply 用于实现（dev/test）。请先写完工件并 /taiyi:continue`,
      );
      process.exit(1);
    }
    const h = taiyiHarness(workspaceDir, slug, !jsonMode);
    if (!h.ok) {
      console.error(h.error);
      process.exit(1);
    }
    for (let i = 1; i <= times; i++) {
      if (times > 1 && !jsonMode) {
        console.log(`=== /taiyi:apply 第 ${i}/${times} 次（${phase}）===\n`);
      } else       if (times === 1 && !jsonMode) {
        console.log(`=== /taiyi:apply（${phase}）===\n`);
        console.log(
          "说明: apply 只输出实现清单，不会写代码也不会 complete；实现并写 .dev-complete 后请 /taiyi:continue\n",
        );
      }
      if (!jsonMode && "text" in h && h.text) {
        console.log(h.text);
        if (i < times) console.log("");
      } else if (jsonMode) {
        console.log(JSON.stringify({ round: i, total: times, ...h }, null, 2));
      }
    }
    break;
  }
  case "loop": {
    const { positional, times, timesExplicit } = parseRepeatCount(stripFlags(args));
    const r = resolveActiveSlug(taiyiRoot, positional[0]);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    const slug = r.slug;
    const result = runLoopUntilComplete(
      engine,
      workspaceDir,
      taiyiRoot,
      slug,
      timesExplicit ? times : undefined,
    );
    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatLoopResultPlain(result, engine, taiyiRoot, workspaceDir));
      if (!result.ok) {
        console.log("");
        console.log(formatAgentLoopProtocol(slug, result.loopRound, result.maxRounds));
      }
    }
    process.exit(result.ok ? 0 : 1);
  }
  case "next": {
    const slug = requireSlug(args);
    const r = taiyiNext(workspaceDir, slug, !jsonMode);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    if ("text" in r && r.text) console.log(r.text);
    else console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "status": {
    const slug = requireSlug(args);
    const r = taiyiStatus(workspaceDir, slug);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    if (jsonMode) {
      const payload = compactMode
        ? {
            engineTruth: r.engineTruth,
            statusLine: formatPhaseProgressLine(r.guide),
          }
        : {
            engineTruth: r.engineTruth,
            state: r.state,
            guide: r.guide,
            openspec: r.openspec,
          };
      console.log(JSON.stringify(payload, null, 2));
    } else if (compactMode) {
      console.log(formatStatusCompact(r.guide));
    } else {
      console.log(formatStatusPlain(r.guide));
    }
    break;
  }
  case "commit-trailers": {
    const { positional } = parseRepeatCount(stripFlags(args));
    const resolved = resolveActiveSlug(taiyiRoot, positional[0]);
    if (!resolved.ok) {
      console.error(resolved.error);
      process.exit(1);
    }
    const state = engine.getState(resolved.slug);
    const phase = state?.currentPhase ?? "dev";
    const subject = positional.slice(1).join(" ").trim() || "feat: deliver change slice";
    const suggestion = suggestCommitMessage(resolved.slug, phase, subject);
    const check = evaluateCommitTrailers(workspaceDir, resolved.slug, phase);
    if (jsonMode) {
      console.log(JSON.stringify({ slug: resolved.slug, phase, suggestion, check }, null, 2));
    } else {
      console.log(suggestion);
      if (!check.skipped && !check.passed) {
        console.error(`\n⚠ ${check.reason}`);
        if (check.hints?.length) console.error(check.hints.join("\n"));
      } else if (!check.skipped && check.passed) {
        console.error("\n✓ 当前分支已有匹配的 Taiyi-Change trailer");
      }
    }
    break;
  }
  case "handoff":
  case "pause": {
    const { positional } = parseRepeatCount(stripFlags(args));
    const slug = positional[0];
    const note = positional.slice(1).join(" ").trim() || undefined;
    const r = taiyiHandoff(workspaceDir, slug, note);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    if (jsonMode) {
      console.log(JSON.stringify(r, null, 2));
    } else if ("noop" in r && r.noop && r.message) {
      console.log(r.message);
    } else {
      console.log(`已写入: ${r.path}`);
      console.log(`恢复: /taiyi:status ${r.slug}`);
    }
    break;
  }
  case "guide": {
    const slug = requireSlug(args);
    const r = taiyiGuide(workspaceDir, slug);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "assess": {
    const slug = requireSlug(args);
    const r = taiyiAssess(workspaceDir, slug);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "mark-aux": {
    const [slug, skill] = args;
    if (!slug || !skill) {
      console.error("用法: mark-aux <slug> <taiyi-skill>");
      process.exit(1);
    }
    const r = taiyiMarkAux(workspaceDir, slug, skill);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "phases": {
    for (const p of listPhases()) {
      console.log(
        `${p.order}. ${p.id} → ${p.skill} → ${p.artifact} (requires: ${p.requires.join(", ") || "-"})`,
      );
    }
    break;
  }
  case "sync":
  case "sync-openspec": {
    const slug = requireSlug(args);
    const force = args.includes("--force");
    const r = taiyiSyncOpenspec(workspaceDir, slug, { force });
    if (jsonMode) {
      console.log(JSON.stringify(r, null, 2));
    } else if (r.ok || "copied" in r) {
      console.log(formatSyncOpenspecPlain(slug, r));
    } else {
      console.error("error" in r ? r.error : formatSyncOpenspecPlain(slug, r));
    }
    if (!r.ok) process.exit(1);
    break;
  }
  case "archive": {
    const slug = requireSlug(args);
    const skipSpecs = args.includes("--skip-specs");
    const r = taiyiArchive(workspaceDir, slug, { skipSpecs });
    if (jsonMode) {
      console.log(JSON.stringify(r, null, 2));
    } else if (r.ok) {
      console.log(formatArchivePlain(slug, r));
    } else {
      console.error(formatArchivePlain(slug, r));
    }
    if (!r.ok) process.exit(1);
    break;
  }
  case "ci": {
    const [sub, ...rest] = args;
    const pkgRoot = resolvePackageRoot(import.meta.url);
    if (sub === "verify") {
      runVerifyCommand(rest);
      break;
    }
    if (sub === "platform") {
      const platform = rest[0] as CiPlatformId;
      if (!platform || !["opencode", "claude", "codex", "cursor"].includes(platform)) {
        console.error("用法: ci platform <opencode|claude|codex|cursor>");
        process.exit(1);
      }
      const r = taiyiCiPlatform(pkgRoot, platform, !jsonMode);
      if ("text" in r && r.text) console.log(r.text);
      else console.log(JSON.stringify(r, null, 2));
      if (!r.ok) process.exit(1);
      break;
    }
    if (sub === "prompt") {
      const slug = rest[0];
      if (!slug) {
        console.error("用法: ci prompt <slug>");
        process.exit(1);
      }
      const r = taiyiCiPrompt(workspaceDir, slug);
      if (!r.ok) {
        console.error(r.error);
        process.exit(1);
      }
      console.log(jsonMode ? JSON.stringify(r, null, 2) : `CI prompt: ${r.promptFile}`);
      break;
    }
    console.error("用法: ci verify | ci platform | ci prompt");
    process.exit(1);
  }
  case "done": {
    const { argv: doneArgs, approver } = extractApprover(args);
    const slug = requireSlug(doneArgs);
    const state = engine.getState(slug);
    if (!state) {
      console.error(formatChangeNotFound(slug));
      process.exit(1);
    }
    if (isWorkflowCompleted(state)) {
      console.log(`变更 ${slug} ${completedWorkflowMessage(state)}`);
      break;
    }
    completeCurrentPhase(slug, state.currentPhase as PhaseId, approver);
    break;
  }
  case "harness": {
    const { slug, times } = requireSlugAndRepeat(args);
    const r = taiyiHarness(workspaceDir, slug, !jsonMode);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    for (let i = 1; i <= times; i++) {
      if (times > 1 && !jsonMode) {
        console.log(`=== /taiyi:check 第 ${i}/${times} 次 ===\n`);
      }
      if ("text" in r && r.text) console.log(r.text);
      else console.log(JSON.stringify(times > 1 ? { round: i, total: times, ...r } : r, null, 2));
      if (i < times && !jsonMode) console.log("");
    }
    break;
  }
  case "harness-check": {
    const { positional } = parseRepeatCount(stripFlags(args));
    const slug = positional[0];
    const hookRef = positional.slice(1).join(" ").trim();
    if (!slug || !hookRef) {
      console.error("用法: harness-check <slug> <hook-key>");
      process.exit(1);
    }
    const r = taiyiHarnessCheck(workspaceDir, slug, hookRef);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    console.log(jsonMode ? JSON.stringify(r, null, 2) : r.message);
    break;
  }
  case "walkthrough": {
    let slug: string | undefined;
    const profile = resolveProfileFromArgs(args);
    const slugIdx = args.indexOf("--slug");
    if (slugIdx >= 0) slug = args[slugIdx + 1];
    const r = taiyiWalkthrough(workspaceDir, { slug, profile, plain: !jsonMode });
    if (!r.ok) {
      if ("text" in r && r.text) console.error(r.text);
      else console.error("error" in r ? r.error : "walkthrough failed");
      process.exit(1);
    }
    if ("text" in r && r.text) console.log(r.text);
    else console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "browser-smoke": {
    const r = runBrowserSmoke(workspaceDir, !jsonMode);
    if (!r.ok) {
      if (r.text) console.error(r.text);
      console.error(r.error);
      process.exit(1);
    }
    if (jsonMode) console.log(JSON.stringify({ ok: true, text: r.text }, null, 2));
    else console.log(r.text);
    break;
  }
  case "complete": {
    const { argv: completeArgs, approver } = extractApprover(args);
    const { positional } = parseRepeatCount(stripFlags(completeArgs));
    const [slug, phase] = positional;
    if (!slug || !phase) {
      console.error("用法: complete <slug> <phase> [--approver 名字]  （或: done [slug] [--approver 名字]）");
      process.exit(1);
    }
    completeCurrentPhase(slug, phase as PhaseId, approver);
    break;
  }
  case "review-check": {
    const slug = requireSlug(args);
    const r = taiyiReviewCheck(workspaceDir, slug, !jsonMode);
    if (!r.ok) {
      if ("text" in r && r.text) console.error(r.text);
      else console.error("error" in r ? r.error : "review-check failed");
      process.exit(1);
    }
    if ("text" in r && r.text) console.log(r.text);
    else console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "review-loop": {
    const slug = requireSlug(args);
    const r = taiyiReviewLoop(workspaceDir, slug, !jsonMode);
    if (jsonMode) {
      console.log(JSON.stringify(r, null, 2));
    } else if ("text" in r && r.text) {
      console.log(r.text);
    }
    process.exit(r.ok ? 0 : 1);
  }
  case "ralph": {
    const slug = requireSlug(args);
    const r = taiyiRalph(workspaceDir, slug, !jsonMode);
    if (jsonMode) {
      console.log(JSON.stringify(r, null, 2));
    } else if ("text" in r && r.text) {
      console.log(r.text);
    }
    process.exit(r.ok ? 0 : 1);
  }
  case "autopilot": {
    const slug = requireSlug(args);
    const r = taiyiAutopilot(workspaceDir, slug, !jsonMode);
    if (!r.ok && !("text" in r && r.text)) {
      console.error("error" in r ? r.error : "autopilot failed");
      process.exit(1);
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    process.exit(r.ok ? 0 : 1);
  }
  case "team": {
    const slug = requireSlug(args);
    const r = taiyiTeam(workspaceDir, slug, !jsonMode);
    if (!r.ok) {
      if ("text" in r && r.text) console.error(r.text);
      else console.error("error" in r ? r.error : "team failed");
      process.exit(1);
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    process.exit(r.ok ? 0 : 1);
  }
  case "ultrawork": {
    const slug = requireSlug(args);
    const r = taiyiUltrawork(workspaceDir, slug, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    process.exit(r.ok ? 0 : 1);
  }
  case "agent": {
    const { positional } = parseRepeatCount(stripFlags(args));
    const role = positional[0];
    if (!role) {
      console.error("用法: agent <role|list> [slug]");
      process.exit(1);
    }
    const r = taiyiAgent(workspaceDir, role, positional[1], !jsonMode);
    if (!r.ok) {
      if ("text" in r && r.text) console.error(r.text);
      else console.error("error" in r ? r.error : "agent failed");
      process.exit(1);
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    break;
  }
  case "write": {
    const { positional } = parseRepeatCount(stripFlags(args));
    const r = taiyiWrite(workspaceDir, positional[0], !jsonMode);
    printHandlerResult(r, false);
    break;
  }
  case "feature": {
    const create = args.includes("--create");
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiFeature(workspaceDir, title || undefined, { plain: !jsonMode, create });
    printHandlerResult(r, false);
    break;
  }
  case "bug": {
    const create = args.includes("--create");
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiBug(workspaceDir, title || undefined, { plain: !jsonMode, create });
    printHandlerResult(r, false);
    break;
  }
  case "flow": {
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiFlow(workspaceDir, title || undefined, { plain: !jsonMode });
    printHandlerResult(r, false);
    break;
  }
  case "mvp": {
    const create = args.includes("--create");
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiMvp(workspaceDir, title || undefined, { plain: !jsonMode, create });
    printHandlerResult(r, false);
    break;
  }
  case "micro": {
    const create = args.includes("--create");
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiMicro(workspaceDir, title || undefined, { plain: !jsonMode, create });
    printHandlerResult(r, false);
    break;
  }
  case "nano": {
    const create = args.includes("--create");
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiNano(workspaceDir, title || undefined, { plain: !jsonMode, create });
    printHandlerResult(r, false);
    break;
  }
  case "service": {
    const create = args.includes("--create");
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiService(workspaceDir, title || undefined, { plain: !jsonMode, create });
    printHandlerResult(r, false);
    break;
  }
  case "design-system": {
    const create = args.includes("--create");
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiDesignSystem(workspaceDir, title || undefined, { plain: !jsonMode, create });
    printHandlerResult(r, false);
    break;
  }
  case "ci-scenario": {
    const title = stripFlags(args).join(" ").trim();
    const r = taiyiCiScenario(workspaceDir, title || undefined, { plain: !jsonMode });
    printHandlerResult(r, false);
    break;
  }
  case "token": {
    const [sub, ...tokenArgs] = args;
    const phaseIdx = tokenArgs.indexOf("--phase");
    const phase = (phaseIdx >= 0 ? tokenArgs[phaseIdx + 1] : undefined) as PhaseId | undefined;
    const kindIdx = tokenArgs.indexOf("--kind");
    const kind =
      kindIdx >= 0 ? (tokenArgs[kindIdx + 1] as "agent" | "artifact" | "scan") : undefined;
    const labelIdx = tokenArgs.indexOf("--label");
    const label = labelIdx >= 0 ? tokenArgs[labelIdx + 1] : undefined;
    const { positional } = parseRepeatCount(stripFlags(tokenArgs));

    const effectiveSub =
      sub === "status" || !sub
        ? ("status" as const)
        : sub === "record" || sub === "scan" || sub === "compress"
          ? sub
          : null;
    if (!effectiveSub) {
      console.error("用法: /taiyi:token status|record|scan|compress …（Agent 代跑 taiyi-forge.sh token …）");
      process.exit(1);
    }

    let slug: string | undefined;
    let tokens: number | undefined;
    if (effectiveSub === "record") {
      if (positional.length >= 2) {
        slug = positional[0];
        tokens = Number(positional[1]);
      } else if (positional.length === 1) {
        const n = Number(positional[0]);
        if (Number.isFinite(n)) tokens = n;
        else slug = positional[0];
      }
    } else if (positional[0]) {
      slug = positional[0];
    }

    const r = taiyiToken(workspaceDir, effectiveSub, { slug, tokens, phase, kind, label });
    if (!r.ok) {
      console.error("error" in r ? r.error : "token failed");
      process.exit(1);
    }
    if ("text" in r && r.text) console.log(r.text);
    break;
  }
  case "step": {
    const modeIdx = args.indexOf("--mode");
    const mode = modeIdx >= 0 ? args[modeIdx + 1] : undefined;
    const slugArg = args.find((a) => !a.startsWith("--") && a !== mode);
    const r = taiyiStep(workspaceDir, slugArg, { mode }, !jsonMode);
    if (!r.ok && !("text" in r && r.text)) {
      console.error("error" in r ? r.error : "step failed");
      process.exit(1);
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    const code = "exitCode" in r && typeof r.exitCode === "number" ? r.exitCode : r.ok ? 0 : 1;
    process.exit(code);
  }
  case "trim-ahead": {
    const slugArg = args.find((a) => !a.startsWith("--"));
    const r = taiyiTrimAhead(workspaceDir, slugArg, !jsonMode);
    if (!r.ok) {
      console.error("error" in r ? r.error : "trim-ahead failed");
      process.exit(1);
    }
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    break;
  }
  case "prune": {
    const dryRun = args.includes("--dry-run");
    const includeAborted = args.includes("--aborted");
    const r = taiyiPrune(workspaceDir, { dryRun, includeAborted }, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    break;
  }
  case "stop-mode": {
    const force = args.includes("--force") || args.includes("--all");
    const MODE_IDS = new Set([
      "ralph",
      "autopilot",
      "ultrawork",
      "ultraqa",
      "team",
      "ralplan",
      "plan",
    ]);
    const positional = args.filter((a) => !a.startsWith("--"));
    const modeArg = positional.find((a) => MODE_IDS.has(a)) as
      | import("../core/runtime/mode-state.js").TaiyiModeId
      | undefined;
    const slugArg = positional.find((a) => !MODE_IDS.has(a));
    const r = taiyiStopMode(workspaceDir, { force, slug: slugArg, mode: modeArg }, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    break;
  }
  case "daemon": {
    const [sub, ...rest] = args.filter((a) => a !== "--json");
    const engineOnly = rest.includes("--engine-only");
    const dryRun = rest.includes("--dry-run");
    const force = rest.includes("--force");
    const positional = rest.filter((a) => !a.startsWith("--"));

    if (sub === "status") {
      const slugArg = positional[0];
      const resolved = slugArg
        ? resolveChangeSlug(taiyiRoot, slugArg)
        : resolveActiveSlug(taiyiRoot);
      if (!resolved.ok) {
        console.error(resolved.error);
        if (resolved.error.includes("多个")) {
          console.error("用法: daemon status <slug>   # 多变更并存时须指定 slug");
        } else if (resolved.error.includes("没有进行中")) {
          console.error("用法: daemon status <slug>   # 或 archive 中 slug 查历史 runtime");
        }
        process.exit(1);
      }
      const st = readDaemonState(taiyiRoot, resolved.slug);
      if (jsonMode) {
        console.log(JSON.stringify({ slug: resolved.slug, daemon: st }, null, 2));
      } else if (st) {
        console.log(
          `Daemon ${resolved.slug}: round ${st.round}/${st.maxRounds} · phase ${st.lastPhase} · ${st.active ? "active" : "stopped"}${st.lastStopReason ? ` (${st.lastStopReason})` : ""}`,
        );
      } else {
        console.log(`Daemon ${resolved.slug}: (no runtime state)`);
      }
      break;
    }

    if (sub !== "run") {
      console.error("用法: daemon run <slug> [--engine-only] [--dry-run] [--force]");
      console.error("      daemon status [slug]");
      process.exit(1);
    }

    if (!positional[0]) {
      console.error("用法: daemon run <slug> [--engine-only] [--dry-run] [--force]");
      process.exit(1);
    }

    const resolved = resolveActiveSlug(taiyiRoot, positional[0]);
    if (!resolved.ok) {
      console.error(resolved.error);
      process.exit(1);
    }

    const result = runDaemonLoop(engine, workspaceDir, taiyiRoot, resolved.slug, {
      engineOnly,
      dryRun,
      force,
    });
    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatDaemonResultPlain(result));
    }
    process.exit(result.ok ? 0 : 1);
  }
  case "modes": {
    const r = taiyiModes(workspaceDir, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    break;
  }
  case "remember": {
    const note = args.filter((a) => !a.startsWith("--")).join(" ").trim();
    const r = taiyiRemember(workspaceDir, note || undefined, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    break;
  }
  case "keyword": {
    const prompt = args.join(" ").trim();
    const r = taiyiKeyword(workspaceDir, prompt, !jsonMode);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
    process.exit(r.ok ? 0 : 1);
  }
  default:
    if (rawCmd && SLASH_ONLY_COMMANDS.has(rawCmd)) {
      const hint = taiyiChatSlashOnlyHint(rawCmd);
      console.error(hint.text);
      process.exit(2);
    }
    if (cmd && WORKFLOW_SKILL_VERBS.has(cmd)) {
      const { positional } = parseRepeatCount(stripFlags(args));
      const r = taiyiWorkflowSkill(workspaceDir, cmd, positional[0], !jsonMode);
      if (jsonMode) console.log(JSON.stringify(r, null, 2));
      else if ("text" in r && r.text) console.log(r.text);
      else if ("error" in r && r.error) console.error(r.error);
      process.exit(r.ok ? 0 : 1);
    }
    if (cmd && PHASE_WRITE_VERBS.has(cmd)) {
      const { positional } = parseRepeatCount(stripFlags(args));
      const r = taiyiPhaseWrite(workspaceDir, cmd, positional[0], !jsonMode);
      if (jsonMode) console.log(JSON.stringify(r, null, 2));
      else if ("text" in r && r.text) console.log(r.text);
      else if ("error" in r && r.error) console.error(r.error);
      process.exit(r.ok ? 0 : 1);
    }
    usage();
    process.exit(rawCmd ? 2 : 0);
}
