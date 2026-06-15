import fs from "node:fs";
import path from "node:path";
import type { InstallResult } from "./types.js";

export const WRAPPER_MARKER = "TAIYI-FORGE:PROJECT-WRAPPER";
const WRAPPER_MARKER_RE = /^# TAIYI-FORGE:PROJECT-WRAPPER[^\n]*\n/m;
const SHIM_SENTINEL = "resolve_upstream_wrapper";

/** 旧版完整 wrapper 须具备的关键转发（shim 模式不检查） */
export const WRAPPER_REQUIRED_SNIPPETS = [
  'run_taiyi list "$@"',
  "run_taiyi prune",
  "run_taiyi resume",
  "run_taiyi trim-ahead",
  "smoke-reset",
] as const;

function readPkgVersion(pkgRoot: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version?.trim() || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function stripWrapperSyncMeta(content: string): string {
  return content.replace(WRAPPER_MARKER_RE, "").replace(/^# synced by taiyi-forge-install[^\n]*\n/m, "");
}

/** 消费方薄 shim：始终 exec 到 node_modules 内最新 scripts/taiyi-forge.sh */
export function buildConsumerWrapperShim(version: string): string {
  return `#!/usr/bin/env bash
# ${WRAPPER_MARKER} v${version} — exec node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")/.." && pwd)"

resolve_upstream_wrapper() {
  local pkg="\${ROOT_DIR}/node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh"
  if [[ -f "\$pkg" ]]; then
    echo "\$pkg"
    return 0
  fi
  if [[ -n "\${TAIYI_FORGE_ROOT:-}" && -f "\${TAIYI_FORGE_ROOT}/scripts/taiyi-forge.sh" ]]; then
    echo "\${TAIYI_FORGE_ROOT}/scripts/taiyi-forge.sh"
    return 0
  fi
  if [[ -f "\${ROOT_DIR}/.taiyi/forge-root" ]]; then
    local _fr
    _fr="$(tr -d '[:space:]' < "\${ROOT_DIR}/.taiyi/forge-root")"
    if [[ -f "\${_fr}/scripts/taiyi-forge.sh" ]]; then
      echo "\${_fr}/scripts/taiyi-forge.sh"
      return 0
    fi
  fi
  return 1
}

if target="$(resolve_upstream_wrapper)"; then
  exec bash "\$target" "\$@"
fi

echo "[taiyi-forge] wrapper shim: 未找到 oh-my-taiyiforge — npm install 后重试" >&2
exit 2
`;
}

export function buildProjectWrapperBody(srcBody: string, version: string): string {
  return buildConsumerWrapperShim(version);
}

export function isProjectWrapperStale(
  workspaceDir: string,
  pkgRoot: string,
): { stale: boolean; detail: string } {
  const dest = path.join(workspaceDir, "scripts", "taiyi-forge.sh");
  const version = readPkgVersion(pkgRoot);
  if (!fs.existsSync(dest)) {
    return { stale: true, detail: "缺少 scripts/taiyi-forge.sh" };
  }
  const existing = fs.readFileSync(dest, "utf8");
  const expected = buildConsumerWrapperShim(version);
  if (existing.includes(SHIM_SENTINEL)) {
    const stale = !existing.includes(`v${version}`);
    return stale
      ? {
          stale: true,
          detail: `wrapper shim 版本过旧 — npx taiyi-forge-install --cursor（当前引擎 v${version}）`,
        }
      : { stale: false, detail: `wrapper shim v${version} → node_modules/oh-my-taiyiforge` };
  }
  const missing = WRAPPER_REQUIRED_SNIPPETS.filter((s) => !existing.includes(s));
  const legacyListNoForward =
    /run_taiyi list\s*$/.test(existing) ||
    (existing.includes("run_taiyi list") && !existing.includes('run_taiyi list "$@"'));
  if (legacyListNoForward || missing.length > 0) {
    return {
      stale: true,
      detail:
        missing.length > 0
          ? `wrapper 过旧（缺 ${missing.join(", ")}）— npx taiyi sync-wrapper`
          : `wrapper list 未传 "$@" — npx taiyi sync-wrapper`,
    };
  }
  return {
    stale: true,
    detail: `wrapper 为旧版完整脚本，建议升级为 shim — TAIYI_FORGE_FORCE_PROJECT_WRAPPER=1 npx taiyi-forge-install --cursor`,
  };
}

/** 向消费方项目写入 scripts/taiyi-forge.sh（薄 shim，转发 node_modules） */
export function installProjectWrapper(cwd: string, pkgRoot: string): InstallResult {
  const destDir = path.join(cwd, "scripts");
  const dest = path.join(destDir, "taiyi-forge.sh");

  if (path.resolve(cwd) === path.resolve(pkgRoot)) {
    return {
      target: "project-wrapper",
      path: dest,
      action: "skipped",
      detail: "pkg root — 已有 scripts/taiyi-forge.sh",
    };
  }

  const upstream = path.join(pkgRoot, "scripts", "taiyi-forge.sh");
  if (!fs.existsSync(upstream)) {
    return {
      target: "project-wrapper",
      path: dest,
      action: "failed",
      detail: `missing wrapper template: ${upstream}`,
    };
  }

  const hasTaiyi = fs.existsSync(path.join(cwd, ".taiyi"));
  const hasPkg = fs.existsSync(path.join(cwd, "package.json"));
  const hasInstalledPkg = fs.existsSync(
    path.join(cwd, "node_modules", "oh-my-taiyiforge"),
  );
  const force = process.env.TAIYI_FORGE_FORCE_PROJECT_WRAPPER === "1";
  if (!force && !hasTaiyi && !hasPkg && !hasInstalledPkg) {
    return {
      target: "project-wrapper",
      path: dest,
      action: "skipped",
      detail:
        "no .taiyi/、package.json 或 node_modules/oh-my-taiyiforge（设 TAIYI_FORGE_FORCE_PROJECT_WRAPPER=1 强制）",
    };
  }

  fs.mkdirSync(destDir, { recursive: true });
  const version = readPkgVersion(pkgRoot);
  const normalized = buildConsumerWrapperShim(version);
  const existing = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : "";
  const legacyFullWrapper = existing.length > 0 && !existing.includes(SHIM_SENTINEL);
  if (!legacyFullWrapper && existing === normalized) {
    return {
      target: "project-wrapper",
      path: dest,
      action: "skipped",
      detail: `scripts/taiyi-forge.sh shim v${version} 已是最新`,
    };
  }
  fs.writeFileSync(dest, normalized, "utf8");
  fs.chmodSync(dest, 0o755);

  const taiyiDir = path.join(cwd, ".taiyi");
  if (fs.existsSync(taiyiDir) || hasTaiyi || hasInstalledPkg) {
    fs.mkdirSync(taiyiDir, { recursive: true });
    fs.writeFileSync(path.join(taiyiDir, "forge-root"), pkgRoot + "\n", "utf8");
  }

  return {
    target: "project-wrapper",
    path: dest,
    action: "updated",
    detail: legacyFullWrapper
      ? `旧版 wrapper 已迁移为 shim v${version} → node_modules/oh-my-taiyiforge`
      : `scripts/taiyi-forge.sh shim v${version} → node_modules/oh-my-taiyiforge`,
  };
}
