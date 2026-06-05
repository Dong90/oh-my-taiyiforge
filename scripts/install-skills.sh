#!/usr/bin/env bash
# 将 taiyi-* skills 安装到 Claude / Codex / Cursor 技能目录（开源仓库分发用）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-all}"

install_to() {
  local dest="$1"
  mkdir -p "$dest"
  for skill in "$ROOT"/skills/taiyi-*/SKILL.md; do
    name="$(basename "$(dirname "$skill")")"
    rm -rf "$dest/$name"
    cp -R "$(dirname "$skill")" "$dest/$name"
  done
  echo "Installed taiyi skills -> $dest"
}

case "$TARGET" in
  claude)
    install_to "${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
    ;;
  codex)
    install_to "${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"
    ;;
  cursor)
    install_to "${CURSOR_SKILLS_DIR:-$HOME/.cursor/skills}"
    ;;
  project-claude)
    install_to "$ROOT/.claude/skills"
    ;;
  project-codex)
    install_to "$ROOT/.codex/skills"
    ;;
  opencode)
    install_to "${OPENCODE_SKILLS_DIR:-$HOME/.config/opencode/skills}"
    ;;
  all)
    install_to "${OPENCODE_SKILLS_DIR:-$HOME/.config/opencode/skills}"
    install_to "${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
    install_to "${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"
    install_to "${CURSOR_SKILLS_DIR:-$HOME/.cursor/skills}"
    ;;
  *)
    echo "Usage: $0 [opencode|claude|codex|cursor|project-claude|project-codex|all]"
    exit 1
    ;;
esac
