import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

const HOOK_MARKER = "TAIYI-FORGE:PHASE-GUARD";

type HookEntry = {
  event: "PreToolUse" | "UserPromptSubmit" | "Stop";
  command: string;
  matcher?: string;
  marker: string;
  src: string;
  destName: string;
  detail: string;
};

const CLAUDE_HOOKS: HookEntry[] = [
  {
    event: "PreToolUse",
    command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/taiyi-phase-guard.mjs',
    matcher: "Edit|Write",
    marker: HOOK_MARKER,
    src: "claude-phase-guard-hook.mjs",
    destName: "taiyi-phase-guard.mjs",
    detail: "PreToolUse phase guard",
  },
  {
    event: "UserPromptSubmit",
    command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/taiyi-keyword.mjs',
    marker: "TAIYI-FORGE:KEYWORD-HOOK",
    src: "claude-keyword-hook.mjs",
    destName: "taiyi-keyword.mjs",
    detail: "keyword → mode activation（对标 OMC keyword-detector）",
  },
  {
    event: "Stop",
    command: 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/taiyi-mode-stop.mjs',
    marker: "TAIYI-FORGE:MODE-STOP",
    src: "claude-mode-stop-hook.mjs",
    destName: "taiyi-mode-stop.mjs",
    detail: "ralph/autopilot stop reinforcement",
  },
];

type ClaudeSettings = {
  hooks?: {
    PreToolUse?: Array<{
      matcher?: string;
      hooks?: Array<{ type?: string; command?: string }>;
    }>;
    UserPromptSubmit?: Array<{ hooks?: Array<{ type?: string; command?: string }> }>;
    Stop?: Array<{ hooks?: Array<{ type?: string; command?: string }> }>;
  };
};

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

function mergeClaudeSettings(settingsPath: string, entries: HookEntry[]): void {
  let cfg: ClaudeSettings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      cfg = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as ClaudeSettings;
    } catch {
      cfg = {};
    }
  }
  cfg.hooks ??= {};

  for (const entry of entries) {
    if (entry.event === "PreToolUse") {
      cfg.hooks.PreToolUse ??= [];
      const groups = cfg.hooks.PreToolUse;
      let group = groups.find((g) => g.matcher === entry.matcher);
      if (!group) {
        group = { matcher: entry.matcher, hooks: [] };
        groups.push(group);
      }
      group.hooks ??= [];
      const exists = group.hooks.some((h) => h.command?.includes(entry.destName.replace(".mjs", "")));
      if (!exists) {
        group.hooks.push({ type: "command", command: entry.command });
      }
      continue;
    }

    const listKey = entry.event;
    const list = (cfg.hooks[listKey] ??= []);
    const exists = list.some((g) =>
      g.hooks?.some((h) => h.command?.includes(entry.destName.replace(".mjs", ""))),
    );
    if (!exists) {
      list.push({
        hooks: [{ type: "command", command: entry.command }],
      });
    }
  }

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

/** 向消费方项目安装 Claude Code hooks（phase guard + keyword + mode stop） */
export function installClaudePhaseGuardHook(cwd: string, pkgRoot: string): InstallResult {
  const skip = shouldSkipInstall(cwd, pkgRoot);
  const hooksDir = path.join(cwd, ".claude", "hooks");
  const settingsPath = path.join(cwd, ".claude", "settings.json");
  const dest = path.join(hooksDir, "taiyi-phase-guard.mjs");

  if (skip) {
    return { target: "claude-hooks", path: dest, action: "skipped", detail: skip };
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
  for (const entry of CLAUDE_HOOKS) {
    const r = installHookFile(pkgRoot, hooksDir, entry);
    if (!r.ok) {
      return { target: "claude-hooks", path: r.dest, action: "failed", detail: r.detail };
    }
    details.push(entry.detail);
  }

  mergeClaudeSettings(settingsPath, CLAUDE_HOOKS);

  return {
    target: "claude-hooks",
    path: dest,
    action: "updated",
    detail: details.join(" · "),
  };
}
