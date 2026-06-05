#!/usr/bin/env node
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolveTemplatesDir } from "../core/package-root.js";
import { requiresHumanGate } from "../core/gates/human-gate-config.js";
import type { ChangeProfile, PhaseId } from "../core/types.js";
import {
  taiyiArchive,
  taiyiAssess,
  taiyiGuide,
  taiyiMarkAux,
  taiyiStatus,
  taiyiSyncOpenspec,
} from "../plugin/handlers.js";

const workspaceDir = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspaceDir);

function usage(): void {
  console.log(`TaiyiForge (oh-my-taiyiforge)

用法:
  npm run taiyi -- init <slug> [--title "名称"] [--profile full|api|ui|lite] [--strict-dev]
  npm run taiyi -- status <slug>              状态 + guide + 复杂度
  npm run taiyi -- guide <slug>               当前该做什么（含辅助 Skill 推荐）
  npm run taiyi -- assess <slug>              评估复杂度（自动读 CHANGE）
  npm run taiyi -- mark-aux <slug> <skill>    标记辅助 Skill 已完成
  npm run taiyi -- phases                     九阶段列表
  npm run taiyi -- complete <slug> <phase>    完成阶段
  npm run taiyi -- sync-openspec <slug>       同步到 openspec/changes/
  npm run taiyi -- archive <slug>             OpenSpec archive

Profile:
  full  九阶段（默认）
  api   跳过 ui-design
  lite  change→requirement→dev→test→integration

环境变量:
  TAIYI_HUMAN_GATE_PHASES=change,design,review  需人工确认的阶段
`);
}

const templatesDir = resolveTemplatesDir(import.meta.url);
const engine = new WorkflowEngine(taiyiRoot, templatesDir);
const [cmd, ...args] = process.argv.slice(2);

function parseProfile(argv: string[]): ChangeProfile | undefined {
  const idx = argv.indexOf("--profile");
  if (idx < 0) return undefined;
  const v = argv[idx + 1] as ChangeProfile;
  if (v === "full" || v === "api" || v === "ui" || v === "lite") return v;
  return undefined;
}

switch (cmd) {
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
    });
    console.log(JSON.stringify(result, null, 2));
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
    console.log(engine.getState(slug));
    break;
  }
  default:
    usage();
    process.exit(cmd ? 1 : 0);
}
