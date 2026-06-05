#!/usr/bin/env bash
# TaiyiForge 统一引擎入口（对齐 oh-my-codex 的 scripts/omc.sh）
# Agent 在 Cursor / Claude / Codex 对话中代跑此脚本，用户无需手打 npx。
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_taiyi_cli() {
  if [[ -n "${TAIYI_FORGE_ROOT:-}" && -f "${TAIYI_FORGE_ROOT}/dist/cli/taiyi.js" ]]; then
    echo "node ${TAIYI_FORGE_ROOT}/dist/cli/taiyi.js"
    return 0
  fi
  if [[ -f "${ROOT_DIR}/dist/cli/taiyi.js" ]]; then
    echo "node ${ROOT_DIR}/dist/cli/taiyi.js"
    return 0
  fi
  if [[ -f "./node_modules/oh-my-taiyiforge/dist/cli/taiyi.js" ]]; then
    echo "node ./node_modules/oh-my-taiyiforge/dist/cli/taiyi.js"
    return 0
  fi
  if command -v taiyi >/dev/null 2>&1; then
    echo "taiyi"
    return 0
  fi
  echo "npx -p oh-my-taiyiforge taiyi"
}

TAIYI_CLI="$(resolve_taiyi_cli)"
cmd="${1:-help}"
shift || true

usage() {
  cat <<'EOF'
TaiyiForge 引擎（OMX 风格统一入口）

用法:
  scripts/taiyi-forge.sh doctor
  scripts/taiyi-forge.sh init <slug> [--auto] [--profile api|lite] [--title "..."]
  scripts/taiyi-forge.sh next <slug>
  scripts/taiyi-forge.sh harness <slug>
  scripts/taiyi-forge.sh harness-check <slug> <key>
  scripts/taiyi-forge.sh complete <slug> <phase>
  scripts/taiyi-forge.sh list
  scripts/taiyi-forge.sh assess <slug>
  scripts/taiyi-forge.sh mark-aux <slug> <skill>
  scripts/taiyi-forge.sh status <slug>
  scripts/taiyi-forge.sh sync-openspec <slug>
  scripts/taiyi-forge.sh archive <slug>

Codex:  $taiyi-forge next <slug>
Claude: 加载 skill taiyi-forge 后按本脚本代跑
Cursor: 终端工具执行本脚本（见 .cursor/rules/taiyiforge.mdc）
EOF
}

run_taiyi() {
  # shellcheck disable=SC2086
  eval "$TAIYI_CLI" "$@"
}

case "$cmd" in
  doctor|init|next|harness|harness-check|complete|list|assess|mark-aux|status|guide|sync-openspec|archive|walkthrough|ci)
    run_taiyi "$cmd" "$@"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "[taiyi-forge] unknown command: $cmd" >&2
    usage >&2
    exit 2
    ;;
esac
