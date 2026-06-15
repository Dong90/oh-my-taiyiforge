#!/usr/bin/env bash
# TaiyiForge — OpenSpec 风格 /taiyi:<verb> 引擎入口
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_taiyi_cli() {
  if [[ -n "${TAIYI_FORGE_ROOT:-}" && -f "${TAIYI_FORGE_ROOT}/dist/cli/taiyi.js" ]]; then
    echo "node ${TAIYI_FORGE_ROOT}/dist/cli/taiyi.js"
    return 0
  fi
  if [[ -f "${ROOT_DIR}/.taiyi/forge-root" ]]; then
    local _forge_root
    _forge_root="$(tr -d '[:space:]' < "${ROOT_DIR}/.taiyi/forge-root")"
    if [[ -n "${_forge_root}" && -f "${_forge_root}/dist/cli/taiyi.js" ]]; then
      echo "node ${_forge_root}/dist/cli/taiyi.js"
      return 0
    fi
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

npx_cli_hint() {
  cat >&2 <<'EOF'
[taiyi-forge] 无法通过 npx 运行 oh-my-taiyiforge（包未发布到 npm 或未安装）。

修复（任选其一）:
  npm install file:/path/to/oh-my-taiyiforge
  npx taiyi-forge-install --cursor
  export TAIYI_FORGE_ROOT=/path/to/oh-my-taiyiforge

本地开发请在消费方项目 link 后再跑 ./scripts/taiyi-forge.sh
EOF
}

run_taiyi() {
  if [[ "$TAIYI_CLI" == npx* ]]; then
    set +e
    local _out _err _code
    _err=$(mktemp)
    _out=$(eval "$TAIYI_CLI" "$@" 2>"$_err")
    _code=$?
    set -e
    if [[ $_code -ne 0 ]]; then
      if grep -qiE '404|ENOTFOUND|could not determine executable|oh-my-taiyiforge' "$_err" 2>/dev/null; then
        npx_cli_hint
      fi
      cat "$_err" >&2
      rm -f "$_err"
      exit "$_code"
    fi
    rm -f "$_err"
    if [[ -n "$_out" ]]; then
      printf '%s\n' "$_out"
    fi
    return 0
  fi
  # shellcheck disable=SC2086
  eval "$TAIYI_CLI" "$@"
}

usage() {
  cat <<'EOF'
TaiyiForge — 推荐 /taiyi:* 斜杠（Agent 代跑本脚本）

真源: docs/taiyi/canonical-commands.md · docs/taiyi/commands.yaml

主流程:
  /taiyi:new 用户登录       /taiyi:status    /taiyi:write
  /taiyi:continue           /taiyi:apply     /taiyi:archive

常用:
  /taiyi:doctor  /taiyi:audit  /taiyi:verify  /taiyi:list  /taiyi:check
  /taiyi:sync  /taiyi:handoff  /taiyi:cancel  /taiyi:loop
  /taiyi:review-loop  /taiyi:feature  /taiyi:bug  /taiyi:ui-test
  /taiyi:ralph  /taiyi:autopilot  /taiyi:daemon  /taiyi:team  /taiyi:ultrawork  /taiyi:agent
  /taiyi:run  /taiyi:browser-smoke  /taiyi:help

维护 CLI（本脚本）:
  list [--all] [--archived]   # --archived 仅 archive/；与 --all 合用才含 changes+archive
  resume  prune [--aborted]  trim-ahead  smoke-reset
  explore/flow/tdd/security/e2e/ui-test/release/ship/land/commit → 仅聊天斜杠

交付链 (gstack · 无 shell，须 IDE 斜杠):
  /taiyi:commit  /taiyi:ship  /taiyi:land  /taiyi:release

Legacy CLI: ls→list · check→harness · pause→handoff · n/go→next · done/ok→done

Codex: $taiyi-new / $taiyi-continue / …
EOF
}

TAIYI_CLI="$(resolve_taiyi_cli)"
cmd="${1:-help}"
shift || true

case "$cmd" in
  new)
    run_taiyi new "$@"
    ;;
  continue)
    run_taiyi continue "$@"
    ;;
  cancel)
    run_taiyi cancel "$@"
    ;;
  handoff|pause)
    run_taiyi handoff "$@"
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
    run_taiyi list "$@"
    ;;
  resume)
    run_taiyi resume "$@"
    ;;
  ship|land|commit)
    run_taiyi "$cmd" "$@"
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
  trim-ahead)
    run_taiyi trim-ahead "$@"
    ;;
  prune)
    run_taiyi prune "$@"
    ;;
  smoke-reset)
    run_taiyi stop-mode --force "$@" 2>/dev/null || true
    echo "[taiyi-forge] smoke-reset: 已 force 停止全部运行时模式"
    ;;
  audit|health|verify|doctor|init|next|harness|harness-check|complete|assess|mark-aux|status|guide|sync|sync-openspec|walkthrough|browser-smoke|ci|token|loop|review-check|review-loop|ralph|autopilot|team|ultrawork|agent|write|feature|bug|change|requirement|design|ui-design|task|dev|test|review|integration|phases|cancel|handoff|pause|commit-trailers|step|stop-mode|modes|remember|keyword|plan|ralplan|ultraqa|visual-verdict|deep-interview|ai-slop-cleaner|ecomode|daemon|trim-ahead|prune|smoke-reset)
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
