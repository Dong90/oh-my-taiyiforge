#!/usr/bin/env node
/**
 * Cursor beforeSubmitPrompt — 关键词自动激活模式（对标 OMC keyword-detector）
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
    JSON.stringify({ active: true, slug, startedAt: now, updatedAt: now, source: "keyword-hook" }, null, 2) + "\n",
    "utf8",
  );
}

function resolveSlug(taiyiRoot) {
  const changes = path.join(taiyiRoot, "changes");
  if (!fs.existsSync(changes)) return undefined;
  const dirs = fs.readdirSync(changes, { withFileTypes: true }).filter((d) => d.isDirectory());
  let active;
  for (const d of dirs) {
    const sp = path.join(changes, d.name, "state.json");
    if (!fs.existsSync(sp)) continue;
    try {
      const st = JSON.parse(fs.readFileSync(sp, "utf8"));
      if (st.workflowStatus === "active" || !st.workflowStatus) {
        active = d.name;
      }
    } catch {
      /* ignore */
    }
  }
  return active;
}

async function main() {
  if (process.env.TAIYI_KEYWORD_HOOK === "off") {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let input = {};
  try {
    input = JSON.parse(readStdin() || "{}");
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = input.prompt ?? input.text ?? input.message ?? "";
  const hit = detectKeyword(prompt);
  if (!hit) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const taiyiRoot = resolveTaiyiRoot(process.cwd());
  const slug = resolveSlug(taiyiRoot);
  const mode = modeIdFromKeyword(hit.type);
  if (mode && slug) {
    activateModeFile(taiyiRoot, mode, slug);
  }

  const inject = buildKeywordInject(hit);
  const injectPath = path.join(taiyiRoot, "runtime", "prompt-inject.txt");
  try {
    fs.mkdirSync(path.dirname(injectPath), { recursive: true });
    fs.writeFileSync(injectPath, inject + "\n", "utf8");
  } catch {
    /* ignore */
  }

  console.log(
    JSON.stringify({
      continue: true,
      additional_context: inject,
    }),
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
