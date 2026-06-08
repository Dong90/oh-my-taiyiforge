#!/usr/bin/env node
/**
 * Codex 无 hook 时的关键词前置检测 — Agent 每轮可先跑此脚本
 * Usage: node scripts/codex-keyword-preflight.mjs "user prompt text"
 * TAIYI-FORGE:CODEX-PREFLIGHT
 */
import fs from "node:fs";
import path from "node:path";
import { detectKeyword, buildKeywordInject, modeIdFromKeyword } from "./keyword-modes-lib.mjs";

function resolveTaiyiRoot(cwd) {
  const base = process.env.TAIYI_WORKSPACE?.trim() || cwd;
  return path.join(path.resolve(base), ".taiyi");
}

function resolveSlug(taiyiRoot) {
  const changes = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changes)) return undefined;
  for (const d of fs.readdirSync(changes, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    const sp = path.join(changes, d.name, "state.json");
    if (!fs.existsSync(sp)) continue;
    try {
      const st = JSON.parse(fs.readFileSync(sp, "utf8"));
      if (st.workflowStatus === "active" || !st.workflowStatus) return d.name;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function activateModeFile(taiyiRoot, mode, slug) {
  const dir = path.join(taiyiRoot, "runtime");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  fs.writeFileSync(
    path.join(dir, `${mode}-mode.json`),
    JSON.stringify({ active: true, slug, startedAt: now, updatedAt: now, source: "codex-preflight" }, null, 2) + "\n",
    "utf8",
  );
}

const prompt = process.argv.slice(2).join(" ").trim();
if (!prompt) {
  console.log("用法: node scripts/codex-keyword-preflight.mjs \"用户消息\"");
  process.exit(0);
}

const hit = detectKeyword(prompt);
if (!hit) {
  console.log("（未检测到 Taiyi 关键词）");
  process.exit(0);
}

const taiyiRoot = resolveTaiyiRoot(process.cwd());
const slug = resolveSlug(taiyiRoot);
const mode = modeIdFromKeyword(hit.type);
if (mode && slug) {
  activateModeFile(taiyiRoot, mode, slug);
}

const inject = buildKeywordInject(hit);
try {
  const injectPath = path.join(taiyiRoot, "runtime", "prompt-inject.txt");
  fs.mkdirSync(path.dirname(injectPath), { recursive: true });
  fs.writeFileSync(injectPath, inject + "\n", "utf8");
} catch {
  /* ignore */
}

console.log(inject);
console.log("");
console.log(`→ 代跑: scripts/taiyi-forge.sh ${hit.slash.replace("/taiyi:", "").replace(/-/g, " ")}${slug ? ` ${slug}` : ""}`);
