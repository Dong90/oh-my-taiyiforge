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
  /taiyi:diagram-pipeline  /taiyi:diagram-c4  /taiyi:diagram-arch  /taiyi:diagram-flow  /taiyi:diagram-render
  /taiyi:run  /taiyi:explore  /taiyi:flow  /taiyi:tdd  /taiyi:browser-smoke  /taiyi:help

引擎斜杠（脚本/CI）:
  /taiyi:init  /taiyi:complete  /taiyi:mark-aux  /taiyi:harness-check  /taiyi:ci *

交付链 (gstack):
  /taiyi:commit  /taiyi:ship  /taiyi:land  /taiyi:release
  /taiyi:gstack review  /taiyi:gstack qa  /taiyi:gstack <skill>

Legacy CLI（无聊天斜杠）: pause·commit-trailers·next·done·change… → 见 canonical-commands.md

Codex: $taiyi-new / $taiyi-continue / …
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
  audit|health|verify|doctor|init|next|harness|harness-check|complete|assess|mark-aux|status|guide|sync|sync-openspec|walkthrough|browser-smoke|ci|token|loop|review-check|review-loop|ralph|autopilot|team|ultrawork|agent|write|feature|bug|change|requirement|design|ui-design|task|dev|test|review|integration|phases|cancel|handoff|pause|commit-trailers|step|stop-mode|modes|remember|keyword|plan|ralplan|ultraqa|visual-verdict|deep-interview|ai-slop-cleaner|ecomode|daemon)
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
