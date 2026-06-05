#!/usr/bin/env node
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolvePackageRoot, resolveTemplatesDir } from "../core/package-root.js";
import { requiresHumanGate } from "../core/gates/human-gate-config.js";
import { formatChangeListPlain, formatGuidePlain, formatPhaseProgressLine, formatStatusPlain } from "../core/format-guide.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { isWorkflowCompleted } from "../core/change-status.js";
import { resolveActiveSlug, slugifyTitle } from "../core/active-slug.js";
import type { ChangeProfile, PhaseId } from "../core/types.js";
import {
  taiyiArchive,
  taiyiAssess,
  taiyiDoctor,
  taiyiGuide,
  taiyiList,
  taiyiMarkAux,
  taiyiNext,
  taiyiStatus,
  taiyiSyncOpenspec,
  taiyiWalkthrough,
  taiyiHarness,
  taiyiHarnessCheck,
  taiyiCiVerify,
  taiyiCiPlatform,
  taiyiCiPrompt,
} from "../plugin/handlers.js";
import type { CiPlatformId } from "../core/ci-platform.js";

const workspaceDir = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspaceDir);
const jsonMode = process.argv.includes("--json");

function usage(): void {
  console.log(`TaiyiForge (oh-my-taiyiforge)

用法:
  npm run taiyi -- doctor                   检查四端安装与配置
  npm run taiyi -- list                     列出 .taiyi/changes/ 下所有变更
  npm run taiyi -- init <slug> [--profile api|lite] [--strict-dev] [--auto] [--json]
  npm run taiyi -- harness <slug>              全自动编排清单（铁三角→辅助→主流程）
  npm run taiyi -- harness-check <slug> <key>  铁三角步骤打卡（auto 模式）
  npm run taiyi -- new <标题>              /taiyi:new — 自动 slug + auto
  npm run taiyi -- status [slug]           /taiyi:status — 阶段进度（3/9）
  npm run taiyi -- continue [slug]        /taiyi:continue — 过关或指引
  npm run taiyi -- apply [slug]           /taiyi:apply — dev/test 实现
  npm run taiyi -- archive [slug]         /taiyi:archive
  npm run taiyi -- next [slug]             仅查看下一步（legacy）
  npm run taiyi -- done [slug]             强制过关当前阶段（legacy）
  npm run taiyi -- guide <slug> [--json]    详细 guide（默认 JSON）
  npm run taiyi -- status <slug> [--json]
  npm run taiyi -- assess <slug>
  npm run taiyi -- mark-aux <slug> <skill>
  npm run taiyi -- complete <slug> <phase>
  npm run taiyi -- sync-openspec <slug>
  npm run taiyi -- archive <slug>
  npm run taiyi -- walkthrough [--slug name] [--profile api|lite]
  npm run taiyi -- ci verify [--slug x] [--require-complete]
  npm run taiyi -- ci platform <opencode|claude|codex|cursor>
  npm run taiyi -- ci prompt <slug>          生成 CI Agent 推进 prompt 文件

Profile: full | api（跳过 ui-design）| lite（五阶段）
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

function stripFlags(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--profile") {
      i++;
      continue;
    }
    if (a.startsWith("--")) continue;
    out.push(a);
  }
  return out;
}

function requireSlug(argv: string[]): string {
  const explicit = stripFlags(argv)[0];
  const r = resolveActiveSlug(taiyiRoot, explicit);
  if (!r.ok) {
    console.error(r.error);
    process.exit(1);
  }
  return r.slug;
}

function tryCompletePhase(slug: string): { ok: true } | { ok: false; error: string } {
  const state = engine.getState(slug);
  if (!state) return { ok: false, error: `Change not found: ${slug}` };
  if (isWorkflowCompleted(state)) return { ok: true };

  const phaseId = state.currentPhase as PhaseId;
  const needsHuman = requiresHumanGate(phaseId);
  const result = engine.completePhase(slug, phaseId, {
    quality: {
      completeness: true,
      consistency: true,
      verifiability: true,
      traceability: true,
      engineering_quality: true,
    },
    human: {
      approved: true,
      approver: needsHuman ? "cli-operator" : "cli-auto",
    },
  });
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

function completeCurrentPhase(slug: string, phaseId: PhaseId): void {
  const r = tryCompletePhase(slug);
  if (!r.ok) {
    console.error(r.error);
    process.exit(1);
  }
  printCompleteSuccess(slug, phaseId);
}

function printDoctor(): void {
  const r = taiyiDoctor();
  if (jsonMode) {
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exit(1);
    return;
  }
  console.log(`TaiyiForge doctor v${r.report.version} — ${r.ok ? "PASS" : "FAIL"}\n`);
  for (const c of r.report.checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.id}: ${c.detail}`);
  }
  if (!r.ok) {
    console.log("\n修复: npx taiyi-forge-install --all");
    process.exit(1);
  }
}

switch (cmd) {
  case "doctor":
    printDoctor();
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
    const result = engine.initChange(slug, {
      title,
      templatesDir,
      profile: parseProfile(args) ?? "full",
      strictDev: args.includes("--strict-dev"),
      autoHarness: args.includes("--auto"),
    });
    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const guide = buildPhaseGuide(taiyiRoot, slug, result, workspaceDir);
      console.log(formatGuidePlain(guide));
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
    const result = engine.initChange(slug, {
      title,
      templatesDir,
      profile: parseProfile(args) ?? "full",
      strictDev: args.includes("--strict-dev"),
      autoHarness: true,
    });
    if (jsonMode) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const guide = buildPhaseGuide(taiyiRoot, slug, result, workspaceDir);
      console.log(`变更: ${slug}\n`);
      console.log(formatGuidePlain(guide));
    }
    break;
  }
  case "continue": {
    const slug = requireSlug(args);
    const state = engine.getState(slug);
    if (!state) {
      console.error(`Change not found: ${slug}`);
      process.exit(1);
    }
    if (isWorkflowCompleted(state)) {
      console.log(`变更 ${slug} 已完成 → /taiyi:archive`);
      break;
    }
    const phaseId = state.currentPhase as PhaseId;
    const attempt = tryCompletePhase(slug);
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
    const slug = requireSlug(args);
    const state = engine.getState(slug);
    if (!state) {
      console.error(`Change not found: ${slug}`);
      process.exit(1);
    }
    if (isWorkflowCompleted(state)) {
      console.log(`变更 ${slug} 已完成 → /taiyi:archive`);
      break;
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
    if (!jsonMode && "text" in h && h.text) {
      console.log(`=== /taiyi:apply（${phase}）===\n`);
      console.log(h.text);
    } else if (jsonMode) {
      console.log(JSON.stringify(h, null, 2));
    }
    break;
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
      console.log(JSON.stringify({ state: r.state, guide: r.guide, openspec: r.openspec }, null, 2));
    } else {
      console.log(formatStatusPlain(r.guide));
    }
    break;
  }
  case "guide": {
    const slug = args[0];
    if (!slug) {
      console.error("缺少 slug");
      process.exit(1);
    }
    const r = taiyiGuide(workspaceDir, slug);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "assess": {
    const slug = args[0];
    if (!slug) {
      console.error("缺少 slug");
      process.exit(1);
    }
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
  case "sync-openspec": {
    const slug = args[0];
    if (!slug) {
      console.error("缺少 slug");
      process.exit(1);
    }
    const force = args.includes("--force");
    const r = taiyiSyncOpenspec(workspaceDir, slug, { force });
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exit(1);
    break;
  }
  case "archive": {
    const slug = requireSlug(args);
    const skipSpecs = args.includes("--skip-specs");
    const r = taiyiArchive(workspaceDir, slug, { skipSpecs });
    console.log(JSON.stringify(r, null, 2));
    if (!r.ok) process.exit(1);
    break;
  }
  case "ci": {
    const [sub, ...rest] = args;
    const pkgRoot = resolvePackageRoot(import.meta.url);
    if (sub === "verify") {
      let slug: string | undefined;
      const slugIdx = rest.indexOf("--slug");
      if (slugIdx >= 0) slug = rest[slugIdx + 1];
      const r = taiyiCiVerify(workspaceDir, {
        slug,
        requireComplete: rest.includes("--require-complete"),
        plain: !jsonMode,
      });
      if ("text" in r && r.text) console.log(r.text);
      else console.log(JSON.stringify(r, null, 2));
      if (!r.ok) process.exit(1);
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
    const slug = requireSlug(args);
    const state = engine.getState(slug);
    if (!state) {
      console.error(`Change not found: ${slug}`);
      process.exit(1);
    }
    if (isWorkflowCompleted(state)) {
      console.log(`变更 ${slug} 九阶段已完成`);
      break;
    }
    completeCurrentPhase(slug, state.currentPhase as PhaseId);
    break;
  }
  case "harness": {
    const slug = requireSlug(args);
    const r = taiyiHarness(workspaceDir, slug, !jsonMode);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    if ("text" in r && r.text) console.log(r.text);
    else console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "harness-check": {
    const [slug, hookRef] = args;
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
      else console.error(r.result?.error ?? "walkthrough failed");
      process.exit(1);
    }
    if ("text" in r && r.text) console.log(r.text);
    else console.log(JSON.stringify(r, null, 2));
    break;
  }
  case "complete": {
    const [slug, phase] = args;
    if (!slug || !phase) {
      console.error("用法: complete <slug> <phase>  （或短命令: done [slug]）");
      process.exit(1);
    }
    completeCurrentPhase(slug, phase as PhaseId);
    break;
  }
  default:
    usage();
    process.exit(cmd ? 1 : 0);
}
