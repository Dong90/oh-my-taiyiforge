#!/usr/bin/env node
/**
 * Run nine-phase E2E on a change slug (default: dogfood-demo) in cwd.
 * Usage: node scripts/dogfood-e2e.mjs [slug]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const templatesDir = path.join(pkgRoot, "templates");
const slug = process.argv[2] ?? "dogfood-demo";

const { WorkflowEngine } = await import(path.join(pkgRoot, "dist/core/workflow-engine.js"));
const { runE2eWorkflow } = await import(path.join(pkgRoot, "dist/core/run-e2e-workflow.js"));
const { resolveTaiyiRoot } = await import(path.join(pkgRoot, "dist/core/paths.js"));

const workspace = process.cwd();
const taiyiRoot = resolveTaiyiRoot(workspace);
const engine = new WorkflowEngine(taiyiRoot, templatesDir);

const result = runE2eWorkflow(engine, slug, templatesDir);
if (!result.ok) {
  console.error(`[dogfood-e2e] FAILED at ${result.completed.length}/9: ${result.error}`);
  process.exit(1);
}

console.log(`[dogfood-e2e] OK — ${slug} completed phases: ${result.completed.join(" → ")}`);
