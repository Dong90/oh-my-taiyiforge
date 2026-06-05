#!/usr/bin/env node
import { WorkflowEngine } from "../core/workflow-engine.js";
import { listPhases } from "../core/phase-registry.js";
import { resolveTaiyiRoot } from "../core/paths.js";
import { resolveTemplatesDir } from "../core/package-root.js";

const workspaceDir = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspaceDir);

function usage(): void {
  console.log(`TaiyiForge (oh-my-taiyiforge)

用法:
  npm run taiyi -- init <slug> [--title "名称"]  创建变更工作区（自动拷贝模板）
  npm run taiyi -- status <slug>         查看阶段状态
  npm run taiyi -- phases                列出九阶段
  npm run taiyi -- complete <slug> <phase>  完成阶段（需工件+门禁）

示例:
  npm run taiyi -- init auth-timeout
`);
}

const templatesDir = resolveTemplatesDir(import.meta.url);
const engine = new WorkflowEngine(taiyiRoot, templatesDir);
const [cmd, ...args] = process.argv.slice(2);

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
    const result = engine.initChange(slug, { title, templatesDir });
    console.log(JSON.stringify(result, null, 2));
    break;
  }
  case "status": {
    const slug = args[0];
    const state = engine.getState(slug);
    if (!state) {
      console.error("未找到变更:", slug);
      process.exit(1);
    }
    console.log(JSON.stringify(state, null, 2));
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
  case "complete": {
    const [slug, phase] = args;
    if (!slug || !phase) {
      console.error("用法: complete <slug> <phase>");
      process.exit(1);
    }
    const result = engine.completePhase(slug, phase as never, {
      quality: {
        completeness: true,
        consistency: true,
        verifiability: true,
        traceability: true,
        engineering_quality: true,
      },
      human: { approved: true, approver: "cli-operator" },
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
