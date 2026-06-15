#!/usr/bin/env node
/**
 * TaiyiForge CI 入口 — 委托给 taiyi ci *
 * Usage:
 *   node scripts/ci.mjs verify [--slug x] [--require-complete]
 *   node scripts/ci.mjs platform <opencode|claude|codex|cursor>
 *   node scripts/ci.mjs prompt <slug>
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const taiyi = path.join(pkgRoot, "dist/cli/taiyi.js");
const [sub, ...rest] = process.argv.slice(2);

if (!sub) {
  console.error("Usage: ci.mjs verify|platform|prompt ...");
  process.exit(1);
}

const args = ["ci", sub, ...rest];
const r = spawnSync(process.execPath, [taiyi, ...args], { cwd: process.cwd(), encoding: "utf8", stdio: "inherit" });
process.exit(r.status ?? 1);
