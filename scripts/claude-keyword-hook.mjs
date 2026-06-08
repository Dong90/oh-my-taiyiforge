#!/usr/bin/env node
/**
 * Claude Code UserPromptSubmit — 关键词自动激活模式（对标 OMC keyword-detector）
 * TAIYI-FORGE:KEYWORD-HOOK
 */
import fs from "node:fs";
import path from "node:path";
import { detectKeyword, buildKeywordInject, modeIdFromKeyword } from "./keyword-modes-lib.mjs";

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function resolveTaiyiRoot(cwd) {
  const base = process.env.TAIYI_WORKSPACE?.trim() || cwd;
  return path.join(path.resolve(base), ".taiyi");
}

function activateModeFile(taiyiRoot, mode, slug) {
  const dir = path.join(taiyiRoot, "runtime");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const file = path.join(dir, `${mode}-mode.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ active: true, slug, startedAt: now, updatedAt: now, source: "claude-keyword-hook" }, null, 2) + "\n",
    "utf8",
  );
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

async function main() {
  if (process.env.TAIYI_KEYWORD_HOOK === "off") {
    process.exit(0);
  }

  let input = {};
  try {
    input = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
  }

  const prompt = input.prompt ?? "";
  const hit = detectKeyword(prompt);
  if (!hit) {
    process.exit(0);
  }

  const cwd = input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const taiyiRoot = resolveTaiyiRoot(cwd);
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

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: inject,
      },
    }),
  );
}

main().catch(() => {
  process.exit(0);
});
