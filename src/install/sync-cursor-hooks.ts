import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

const HOOK_MARKER = "TAIYI-FORGE:PHASE-GUARD";

type HookEntry = {
  event: "preToolUse" | "beforeSubmitPrompt" | "stop";
  command: string;
  matcher?: string;
  marker: string;
  src: string;
  destName: string;
  detail: string;
};

const CURSOR_HOOKS: HookEntry[] = [
  {
    event: "preToolUse",
    command: "node .cursor/hooks/taiyi-phase-guard.mjs",
    matcher: "Write|StrReplace|ApplyPatch|edit",
    marker: HOOK_MARKER,
    src: "cursor-phase-guard-hook.mjs",
    destName: "taiyi-phase-guard.mjs",
    detail: "preToolUse phase guard",
  },
  {
    event: "beforeSubmitPrompt",
    command: "node .cursor/hooks/taiyi-keyword.mjs",
    matcher: "UserPromptSubmit",
    marker: "TAIYI-FORGE:KEYWORD-HOOK",
    src: "cursor-keyword-hook.mjs",
    destName: "taiyi-keyword.mjs",
    detail: "keyword → mode activation（对标 OMC keyword-detector）",
  },
  {
    event: "stop",
    command: "node .cursor/hooks/taiyi-mode-stop.mjs",
    marker: "TAIYI-FORGE:MODE-STOP",
    src: "cursor-mode-stop-hook.mjs",
    destName: "taiyi-mode-stop.mjs",
    detail: "ralph/autopilot stop reinforcement",
  },
];

function shouldSkipInstall(cwd: string, pkgRoot: string): string | null {
  if (path.resolve(cwd) === path.resolve(pkgRoot)) {
    return "pkg root — 不在本仓库安装 hook";
  }
  if (process.env.TAIYI_FORGE_SKIP_HOOKS === "1") {
    return "TAIYI_FORGE_SKIP_HOOKS=1";
  }
  const hasTaiyi = fs.existsSync(path.join(cwd, ".taiyi"));
  const hasPkg = fs.existsSync(path.join(cwd, "package.json"));
  if (!hasTaiyi && !hasPkg) {
    return "无 .taiyi/ 或 package.json";
  }
  return null;
}

function installHookFile(
  pkgRoot: string,
  hooksDir: string,
  entry: HookEntry,
): { ok: boolean; dest: string; detail?: string } {
  const src = path.join(pkgRoot, "scripts", entry.src);
  const dest = path.join(hooksDir, entry.destName);
  if (!fs.existsSync(src)) {
    return { ok: false, dest, detail: `missing ${src}` };
  }
  const body = fs.readFileSync(src, "utf8");
  const marked = body.includes(entry.marker)
    ? body
    : body.replace(/^#!\/usr\/bin\/env node\n/, `#!/usr/bin/env node\n// ${entry.marker}\n`);
  fs.writeFileSync(dest, marked, "utf8");
  fs.chmodSync(dest, 0o755);
  return { ok: true, dest };
}

function mergeHooksJson(hooksJson: string, entries: HookEntry[]): void {
  type HooksFile = { version: number; hooks?: Record<string, unknown[]> };
  let cfg: HooksFile = { version: 1, hooks: {} };
  if (fs.existsSync(hooksJson)) {
    try {
      cfg = JSON.parse(fs.readFileSync(hooksJson, "utf8")) as HooksFile;
      cfg.version ??= 1;
      cfg.hooks ??= {};
    } catch {
      cfg = { version: 1, hooks: {} };
    }
  }

  for (const entry of entries) {
    const list = (cfg.hooks![entry.event] ?? []) as { command?: string; matcher?: string }[];
    const exists = list.some((h) => h.command?.includes(entry.destName.replace(".mjs", "")));
    if (!exists) {
      const hookDef: { command: string; matcher?: string } = { command: entry.command };
      if (entry.matcher) hookDef.matcher = entry.matcher;
      cfg.hooks![entry.event] = [...list, hookDef];
    }
  }

  fs.mkdirSync(path.dirname(hooksJson), { recursive: true });
  fs.writeFileSync(hooksJson, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

/** 向消费方项目安装 Cursor hooks（phase guard + keyword + mode stop） */
export function installCursorPhaseGuardHook(cwd: string, pkgRoot: string): InstallResult {
  const skip = shouldSkipInstall(cwd, pkgRoot);
  const hooksDir = path.join(cwd, ".cursor", "hooks");
  const hooksJson = path.join(cwd, ".cursor", "hooks.json");
  const dest = path.join(hooksDir, "taiyi-phase-guard.mjs");

  if (skip) {
    return { target: "cursor-hooks", path: dest, action: "skipped", detail: skip };
  }

  fs.mkdirSync(hooksDir, { recursive: true });

  const libSrc = path.join(pkgRoot, "scripts", "phase-guard-lib.mjs");
  const libDest = path.join(hooksDir, "phase-guard-lib.mjs");
  if (fs.existsSync(libSrc)) {
    fs.copyFileSync(libSrc, libDest);
  }

  const kwLibSrc = path.join(pkgRoot, "scripts", "keyword-modes-lib.mjs");
  const kwLibDest = path.join(hooksDir, "keyword-modes-lib.mjs");
  if (fs.existsSync(kwLibSrc)) {
    fs.copyFileSync(kwLibSrc, kwLibDest);
  }

  const stopLibSrc = path.join(pkgRoot, "scripts", "mode-stop-lib.mjs");
  const stopLibDest = path.join(hooksDir, "mode-stop-lib.mjs");
  if (fs.existsSync(stopLibSrc)) {
    fs.copyFileSync(stopLibSrc, stopLibDest);
  }

  const details: string[] = [];
  for (const entry of CURSOR_HOOKS) {
    const r = installHookFile(pkgRoot, hooksDir, entry);
    if (!r.ok) {
      return { target: "cursor-hooks", path: r.dest, action: "failed", detail: r.detail };
    }
    details.push(entry.detail);
  }

  mergeHooksJson(hooksJson, CURSOR_HOOKS);

  return {
    target: "cursor-hooks",
    path: dest,
    action: "updated",
    detail: details.join(" · "),
  };
}
