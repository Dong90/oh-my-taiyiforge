#!/usr/bin/env node
/**
 * 在 examples/full-flow-demo 目录内就地跑全流程，生成 .taiyi/changes/<slug>/ 工件。
 * 用法（仓库根）: node examples/full-flow-demo/scripts/run-inplace-verify.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.join(here, "..");
const repo = path.join(workspace, "..", "..");

const build = spawnSync("npm", ["run", "build"], { cwd: repo, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const mod = await import(
  pathToFileURL(path.join(repo, "dist/core/run-slash-flow-cli.js")).href
);

const result = mod.runSlashFlow({
  repoRoot: repo,
  workspaceDir: workspace,
  cleanTaiyi: true,
  verifyAllAgents: true,
  runWorkflowSmoke: true,
  runFinish: true,
});

const reportPath = mod.writeVerifyReport(workspace, result);

console.log("\n══ full-flow-demo 就地验证 ══");
console.log(`ok: ${result.ok}`);
console.log(`change: ${result.changeDir}`);
console.log(`report: ${reportPath}`);
console.log(`files: ${result.generatedFiles.length}/${mod.EXPECTED_CHANGE_ARTIFACTS.length}`);

if (result.generatedFiles.length > 0) {
  console.log("\n已生成:");
  for (const f of result.generatedFiles) {
    console.log(`  · ${path.relative(workspace, f)}`);
  }
}

if (result.errors.length > 0) {
  console.error("\n错误:");
  for (const e of result.errors) console.error(`  ✗ ${e}`);
}

process.exit(result.ok ? 0 : 1);
