#!/usr/bin/env node
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolvePackageRoot, resolveTemplatesDir } from "../core/package-root.js";
import { requiresHumanGate } from "../core/gates/human-gate-config.js";
import { formatChangeListPlain, formatGuidePlain } from "../core/format-guide.js";
import { buildPhaseGuide } from "../core/phase-guide.js";
import { isWorkflowCompleted } from "../core/change-status.js";
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
  npm run taiyi -- next <slug>              人类可读「下一步」（默认纯文本）
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
  case "next": {
    const slug = args[0];
    if (!slug) {
      console.error("缺少 slug");
      process.exit(1);
    }
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
    const slug = args[0];
    if (!slug) {
      console.error("缺少 slug");
      process.exit(1);
    }
    const r = taiyiStatus(workspaceDir, slug);
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    console.log(JSON.stringify(r, null, 2));
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
    const slug = args[0];
    if (!slug) {
      console.error("缺少 slug");
      process.exit(1);
    }
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
  case "harness": {
    const slug = args[0];
    if (!slug) {
      console.error("缺少 slug");
      process.exit(1);
    }
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
      console.error("用法: complete <slug> <phase>");
      process.exit(1);
    }
    const phaseId = phase as PhaseId;
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
    if (!result.ok) {
      console.error(result.error);
      process.exit(1);
    }
    const state = engine.getState(slug);
    if (jsonMode) console.log(JSON.stringify(state, null, 2));
    else if (state && isWorkflowCompleted(state)) {
      console.log(
        `✓ ${phase} 完成 → 九阶段已全部完成 (${state.completedPhases.length}/${9 - (state.skippedPhases?.length ?? 0)})\n→ npx taiyi list`,
      );
    } else {
      console.log(`✓ ${phase} 完成 → 当前阶段: ${state?.currentPhase}\n→ npx taiyi next ${slug}`);
    }
    break;
  }
  default:
    usage();
    process.exit(cmd ? 1 : 0);
}
