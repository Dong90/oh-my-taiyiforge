import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

const HOOK_MARKER = "TAIYI-FORGE:PHASE-GUARD";

type ClaudeSettings = {
  hooks?: {
    PreToolUse?: Array<{
      matcher?: string;
      hooks?: Array<{ type?: string; command?: string }>;
    }>;
  };
};

/** 向消费方项目安装 Claude Code PreToolUse 阶段守卫 */
export function installClaudePhaseGuardHook(cwd: string, pkgRoot: string): InstallResult {
  const hooksDir = path.join(cwd, ".claude", "hooks");
  const settingsPath = path.join(cwd, ".claude", "settings.json");
  const dest = path.join(hooksDir, "taiyi-phase-guard.mjs");
  const src = path.join(pkgRoot, "scripts", "claude-phase-guard-hook.mjs");

  if (path.resolve(cwd) === path.resolve(pkgRoot)) {
    return {
      target: "claude-hooks",
      path: dest,
      action: "skipped",
      detail: "pkg root — 不在本仓库安装 hook",
    };
  }

  if (process.env.TAIYI_FORGE_SKIP_HOOKS === "1") {
    return {
      target: "claude-hooks",
      path: dest,
      action: "skipped",
      detail: "TAIYI_FORGE_SKIP_HOOKS=1",
    };
  }

  const hasTaiyi = fs.existsSync(path.join(cwd, ".taiyi"));
  const hasPkg = fs.existsSync(path.join(cwd, "package.json"));
  if (!hasTaiyi && !hasPkg) {
    return {
      target: "claude-hooks",
      path: dest,
      action: "skipped",
      detail: "无 .taiyi/ 或 package.json",
    };
  }

  if (!fs.existsSync(src)) {
    return {
      target: "claude-hooks",
      path: dest,
      action: "failed",
      detail: `missing ${src}`,
    };
  }

  fs.mkdirSync(hooksDir, { recursive: true });
  const body = fs.readFileSync(src, "utf8");
  const marked = body.includes(HOOK_MARKER)
    ? body
    : body.replace(/^#!\/usr\/bin\/env node\n/, `#!/usr/bin/env node\n// ${HOOK_MARKER}\n`);
  fs.writeFileSync(dest, marked, "utf8");
  fs.chmodSync(dest, 0o755);

  // Copy shared lib next to hook (Claude runs hook from project .claude/hooks/)
  const libSrc = path.join(pkgRoot, "scripts", "phase-guard-lib.mjs");
  const libDest = path.join(hooksDir, "phase-guard-lib.mjs");
  if (fs.existsSync(libSrc)) {
    fs.copyFileSync(libSrc, libDest);
  }

  let cfg: ClaudeSettings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      cfg = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as ClaudeSettings;
    } catch {
      cfg = {};
    }
  }
  cfg.hooks ??= {};
  const groups = cfg.hooks.PreToolUse ?? [];
  const hookCmd = 'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/taiyi-phase-guard.mjs';
  const handler = { type: "command", command: hookCmd };

  let group = groups.find((g) => g.matcher === "Edit|Write");
  if (!group) {
    group = { matcher: "Edit|Write", hooks: [] };
    groups.push(group);
  }
  group.hooks ??= [];
  const exists = group.hooks.some((h) => h.command?.includes("taiyi-phase-guard"));
  if (!exists) {
    group.hooks.push(handler);
  }
  cfg.hooks.PreToolUse = groups;

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");

  return {
    target: "claude-hooks",
    path: dest,
    action: "updated",
    detail: "PreToolUse phase guard（TAIYI_PHASE_GUARD=deny 硬拦）",
  };
}
