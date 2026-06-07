#!/usr/bin/env node
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolvePackageRoot, resolveTemplatesDir } from "../core/package-root.js";
import { resolveHumanForComplete } from "../core/gates/human-gate-config.js";
import { formatChangeListPlain, formatGuidePlain, formatPhaseProgressLine, formatStatusPlain } from "../core/format-guide.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { isChangeAborted, isWorkflowCompleted } from "../core/change-status.js";
import { resolveActiveSlug, slugifyTitle } from "../core/active-slug.js";
import {
  evaluateCommitTrailers,
  suggestCommitMessage,
} from "../core/gates/commit-trailer.js";
import { resolveAutoHarness } from "../core/resolve-auto-harness.js";
import type { ChangeProfile, PhaseId } from "../core/types.js";
import {
  taiyiArchive,
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

const workspaceDir = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspaceDir);
const jsonMode = process.argv.includes("--json");

function usage(): void {
  console.log(`TaiyiForge (oh-my-taiyiforge)

用法:
  npm run taiyi -- doctor [--strict-workspace]     检查四端安装；strict 时工作区 blocker 也 FAIL
  npm run taiyi -- list                     列出 .taiyi/changes/ 下所有变更
  npm run taiyi -- init <slug> [--profile api|lite|ui] [--strict-dev] [--auto] [--force] [--json]
  npm run taiyi -- harness <slug>              全自动编排清单（铁三角→辅助→主流程）
  npm run taiyi -- harness-check <slug> <key>  铁三角步骤打卡（auto 模式）
  npm run taiyi -- new <标题>              /taiyi:new — 自动 slug（默认手动；--auto 全自动）
  npm run taiyi -- cancel [slug]           /taiyi:cancel — 取消进行中变更
  npm run taiyi -- handoff [slug] [备注]   /taiyi:handoff — 写 HANDOFF.md（跨会话恢复）
  npm run taiyi -- commit-trailers [slug] [subject]  建议含 Taiyi-Change trailer 的 commit message
  npm run taiyi -- status [slug]           /taiyi:status — 阶段进度（3/9）
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
  npm run taiyi -- audit [slug]              /taiyi:audit — 流程/交付排查（非 doctor）
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

Profile: full | api（跳过 ui-design）| lite（五阶段）
Token: 见 docs/taiyi/token-budget.yaml · TAIYI_TOKEN_BUDGET / TAIYI_TOKEN_ENFORCE
CI: 见 docs/ci/README.md 与 examples/ci/github-actions/
`);
}

const templatesDir = resolveTemplatesDir(import.meta.url);
const engine = new WorkflowEngine(taiyiRoot, templatesDir);
const argv = process.argv.slice(2).filter((a) => a !== "--json");
const [cmd, ...args] = argv;

function parseProfile(argv: string[]): ChangeProfile | undefined {
  const idx = argv.indexOf("--profile");
  if (idx < 0) return undefined;
  const v = argv[idx + 1] as ChangeProfile;
  if (v === "full" || v === "api" || v === "ui" || v === "lite") return v;
  return undefined;
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
  if (!state) return { ok: false, error: `Change not found: ${slug}` };
  if (isWorkflowCompleted(state)) return { ok: true };

  const phaseId = options?.phaseId ?? (state.currentPhase as PhaseId);
  const humanResolved = resolveHumanForComplete(phaseId, options?.approver);
  if (!humanResolved.ok) {
    return {
      ok: false,
      error: humanResolved.error.includes("approver")
        ? `阶段 ${phaseId} 需人工审批。使用 --approver "你的名字"，例如: npx taiyi complete ${slug} ${phaseId} --approver "你的名字"`
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
    console.log(`✓ ${phaseId} 完成 → 九阶段已全部完成\n→ /taiyi:archive`);
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
    console.log(JSON.stringify(r, null, 2));
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
  case "doctor":
    printDoctor();
    break;
  case "audit": {
    const { positional } = parseRepeatCount(stripFlags(args));
    const r = taiyiAudit(workspaceDir, { slug: positional[0], plain: !jsonMode });
    if (jsonMode) console.log(JSON.stringify(r.report, null, 2));
    else if ("text" in r && r.text) console.log(r.text);
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
    const r = taiyiList(workspaceDir);
    if (jsonMode) console.log(JSON.stringify(r, null, 2));
    else console.log(formatChangeListPlain(r.changes));
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
        profile: parseProfile(args) ?? "full",
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
        profile: parseProfile(args) ?? "full",
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
    const slug = requireSlug(args);
    const result = engine.abortChange(slug);
    if (!result.ok) {
      console.error(result.error);
      process.exit(1);
    }
    if (jsonMode) {
      console.log(JSON.stringify({ ok: true, slug, workflowStatus: "aborted" }, null, 2));
    } else {
      console.log(`已取消变更: ${slug}`);
      console.log("目录仍保留于 .taiyi/changes/；可 /taiyi:new 创建新变更。");
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
      console.error(`Change not found: ${slug}`);
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
      console.error(`Change not found: ${slug}`);
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
      console.log(
        JSON.stringify(
          { engineTruth: r.engineTruth, state: r.state, guide: r.guide, openspec: r.openspec },
          null,
          2,
        ),
      );
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
      console.error(`Change not found: ${slug}`);
      process.exit(1);
    }
    if (isWorkflowCompleted(state)) {
      console.log(`变更 ${slug} 九阶段已完成`);
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
    let profile: ChangeProfile | undefined;
    const slugIdx = args.indexOf("--slug");
    if (slugIdx >= 0) slug = args[slugIdx + 1];
    profile = parseProfile(args);
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
  default:
    usage();
    process.exit(cmd ? 1 : 0);
}
