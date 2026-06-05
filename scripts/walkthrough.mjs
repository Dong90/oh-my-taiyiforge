#!/usr/bin/env node
/**
 * 首次体验引导 — 在空目录演示 api profile 最小路径（人类可读）。
 * Usage: node scripts/walkthrough.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const taiyi = path.join(pkgRoot, "dist/cli/taiyi.js");
const slug = "walkthrough-demo";

function run(args, cwd = pkgRoot) {
  const r = spawnSync("node", [taiyi, ...args], { cwd, encoding: "utf8" });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

console.log("═══ TaiyiForge 首次体验（api profile）═══\n");
console.log("1. 检查安装…");
if (run(["doctor"]) !== 0) {
  console.error("\n请先: npx taiyi-forge-install --all");
  process.exit(1);
}

console.log("\n2. 创建变更…");
run(["init", slug, "--profile", "api", "--title", "Walkthrough API"]);

console.log("\n3. 下一步指引…");
run(["next", slug]);

console.log("\n─── 接下来你可以 ───");
console.log(`  npx taiyi next ${slug}     # 随时看下一步`);
console.log(`  npx taiyi list             # 列出所有变更`);
console.log(`  npx taiyi complete ${slug} change   # 填好 CHANGE.md 后`);
console.log("\n完整九阶段示例: npm run dogfood\n");
