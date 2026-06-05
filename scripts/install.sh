#!/usr/bin/env bash
# TaiyiForge 统一安装 — 委托给 Node CLI（跨平台，对齐 OpenCode plugin 安装）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/dist/cli/install-cli.js" ]]; then
  echo "Building oh-my-taiyiforge..."
  npm run build
fi

exec node "$ROOT/dist/cli/install-cli.js" "${1:---all}"
