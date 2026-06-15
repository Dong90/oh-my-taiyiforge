#!/usr/bin/env node
/**
 * Cross-platform TaiyiForge engine entry (OMX-style). Delegates to taiyi CLI.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 与 scripts/taiyi-forge.sh 对齐的 legacy 别名（CLI 直调时也生效） */
const WRAPPER_ALIASES: Record<string, string> = {
  ls: "list",
  n: "next",
  go: "next",
  ok: "done",
  check: "harness",
  pause: "handoff",
  run: "walkthrough",
  sync: "sync-openspec",
};

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawArgs = process.argv.slice(2);
const args =
  rawArgs[0] && WRAPPER_ALIASES[rawArgs[0]] ? [WRAPPER_ALIASES[rawArgs[0]], ...rawArgs.slice(1)] : rawArgs;

function resolveTaiyiJs(): string {
  if (process.env.TAIYI_FORGE_ROOT) {
    const p = path.join(process.env.TAIYI_FORGE_ROOT, "dist/cli/taiyi.js");
    if (fs.existsSync(p)) return p;
  }
  const local = path.join(root, "dist/cli/taiyi.js");
  if (fs.existsSync(local)) return local;
  const nm = path.join(process.cwd(), "node_modules/oh-my-taiyiforge/dist/cli/taiyi.js");
  if (fs.existsSync(nm)) return nm;
  return local;
}

const taiyiJs = resolveTaiyiJs();
if (!fs.existsSync(taiyiJs)) {
  console.error("[taiyi-forge] dist/cli/taiyi.js not found. Run: npm run build");
  process.exit(1);
}

const r = spawnSync(process.execPath, [taiyiJs, ...args], {
  cwd: process.cwd(),
  stdio: "inherit",
});
process.exit(r.status ?? 1);
