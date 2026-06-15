#!/usr/bin/env node
/**
 * 对齐聊天斜杠 /taiyi:e2e 与 /taiyi:ui-test 的可复现验证路径。
 * 用法（仓库根）: node examples/browser-e2e-smoke/run-verify.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: dir, stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("══ TaiyiForge browser E2E smoke ══");
console.log("Chat path: /taiyi:browser-smoke 或 /taiyi:status → /taiyi:gstack qa → /taiyi:e2e → TEST.md → /taiyi:continue");
console.log("This script runs the Playwright leg only.\n");

if (!fs.existsSync(path.join(dir, "node_modules", "@playwright", "test"))) {
  console.log("→ npm install (first run)…");
  run("npm", ["install"], { cwd: dir });
}

console.log("→ npx playwright install chromium (if needed)…");
const install = spawnSync("npx", ["playwright", "install", "chromium"], {
  cwd: dir,
  stdio: "inherit",
});
if (install.status !== 0) process.exit(install.status ?? 1);

console.log("→ npx playwright test…");
const test = spawnSync("npx", ["playwright", "test"], { cwd: dir, stdio: "inherit" });
if (test.status !== 0) process.exit(test.status ?? 1);

console.log("\n✓ browser-e2e-smoke passed (Playwright /taiyi:e2e equivalent)");
