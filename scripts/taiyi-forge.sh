#!/usr/bin/env bash
# TaiyiForge — OpenSpec 风格 /taiyi:<verb> 引擎入口
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
TaiyiForge（对齐 OpenSpec /opsx:<verb>）

聊天入口:
  /taiyi:new 用户登录       Cursor / Claude
  /taiyi:continue           推进（每阶段写完工件后执行）
  /taiyi:apply              实现（dev/test）
  /taiyi:status             当前第几阶段、该用哪个 Skill
  /taiyi:archive            归档
  /taiyi:loop [slug] [xN]   循环 continue 直到完成或阻塞
  /taiyi:review-loop [slug] 会话内循环 review 直到机器审查通过
  /taiyi:review-check <slug>  单次机器探测（不计轮次）
  /taiyi:audit [slug]           流程/交付排查（漂移、未 commit）
  /taiyi:verify [slug]          PR/CI 工件门禁（= ci verify 别名）
  /taiyi:token status       Token 用量 / 预算
  /taiyi:token compress     压缩 → CONTEXT-COMPACT.md

Codex: $taiyi-new / $taiyi-continue / $taiyi-apply / $taiyi-status / $taiyi-archive / $taiyi-review-loop / $taiyi-review-check / $taiyi-token-*

引擎（Agent 代跑）:
  scripts/taiyi-forge.sh new <标题>
  scripts/taiyi-forge.sh continue [slug]
  scripts/taiyi-forge.sh apply [slug]
  scripts/taiyi-forge.sh archive [slug]

详见 docs/taiyi/commands.yaml
EOF
}

run_taiyi() {
  # shellcheck disable=SC2086
  eval "$TAIYI_CLI" "$@"
}

case "$cmd" in
  new)
    run_taiyi new "$@"
    ;;
  continue)
    run_taiyi continue "$@"
    ;;
  status)
    run_taiyi status "$@"
    ;;
  apply)
    run_taiyi apply "$@"
    ;;
  archive)
    run_taiyi archive "$@"
    ;;
  # legacy 别名
  done|ok)
    run_taiyi done "$@"
    ;;
  n|go)
    run_taiyi next "$@"
    ;;
  ls|list)
    run_taiyi list
    ;;
  check)
    run_taiyi harness "$@"
    ;;
  sync)
    run_taiyi sync-openspec "$@"
    ;;
  run)
    run_taiyi walkthrough "$@"
    ;;
  list)
    run_taiyi list
    ;;
  audit|verify|doctor|init|next|harness|harness-check|complete|assess|mark-aux|status|guide|sync-openspec|walkthrough|ci|token|loop|review-check|review-loop)
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
