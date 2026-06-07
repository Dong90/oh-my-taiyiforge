import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

const HOOK_MARKER = "TAIYI-FORGE:PHASE-GUARD";

/** 向消费方项目安装 Cursor preToolUse 阶段守卫（dev 前改代码 ask/deny） */
export function installCursorPhaseGuardHook(cwd: string, pkgRoot: string): InstallResult {
  const hooksDir = path.join(cwd, ".cursor", "hooks");
  const hooksJson = path.join(cwd, ".cursor", "hooks.json");
  const dest = path.join(hooksDir, "taiyi-phase-guard.mjs");
  const src = path.join(pkgRoot, "scripts", "cursor-phase-guard-hook.mjs");

  if (path.resolve(cwd) === path.resolve(pkgRoot)) {
    return {
      target: "cursor-hooks",
      path: dest,
      action: "skipped",
      detail: "pkg root — 不在本仓库安装 hook",
    };
  }

  if (process.env.TAIYI_FORGE_SKIP_HOOKS === "1") {
    return {
      target: "cursor-hooks",
      path: dest,
      action: "skipped",
      detail: "TAIYI_FORGE_SKIP_HOOKS=1",
    };
  }

  const hasTaiyi = fs.existsSync(path.join(cwd, ".taiyi"));
  const hasPkg = fs.existsSync(path.join(cwd, "package.json"));
  if (!hasTaiyi && !hasPkg) {
    return {
      target: "cursor-hooks",
      path: dest,
      action: "skipped",
      detail: "无 .taiyi/ 或 package.json",
    };
  }

  if (!fs.existsSync(src)) {
    return {
      target: "cursor-hooks",
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

  const libSrc = path.join(pkgRoot, "scripts", "phase-guard-lib.mjs");
  const libDest = path.join(hooksDir, "phase-guard-lib.mjs");
  if (fs.existsSync(libSrc)) {
    fs.copyFileSync(libSrc, libDest);
  }

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

  const entry = {
    command: "node .cursor/hooks/taiyi-phase-guard.mjs",
    matcher: "Write|StrReplace|ApplyPatch|edit",
  };
  const list = (cfg.hooks!.preToolUse ?? []) as { command?: string }[];
  const exists = list.some((h) => h.command?.includes("taiyi-phase-guard"));
  if (!exists) {
    cfg.hooks!.preToolUse = [...list, entry];
  }
  fs.mkdirSync(path.dirname(hooksJson), { recursive: true });
  fs.writeFileSync(hooksJson, JSON.stringify(cfg, null, 2) + "\n", "utf8");

  return {
    target: "cursor-hooks",
    path: dest,
    action: "updated",
    detail: "preToolUse phase guard（TAIYI_PHASE_GUARD=deny 硬拦）",
  };
}
