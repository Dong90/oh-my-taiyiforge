#!/usr/bin/env bash
# PITFALLS 扫描器 —— 两层防线：ast-grep (自动代码模式) + grep (per-module)
# 用法: .pitfalls/scan.sh [--ci] [--module src/core]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CI_MODE=false
TARGET_MODULE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ci) CI_MODE=true; shift ;;
    --module) TARGET_MODULE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

ISSUES=0
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== PITFALLS Scan ==="
echo ""

# ── Layer 1: ast-grep 自动模式扫描 ──
echo "── Layer 1: ast-grep rules ──"
if command -v sg &>/dev/null; then
  for rule_file in "$SCRIPT_DIR"/rules/**/*.yml; do
    if [[ -f "$rule_file" ]]; then
      rule_name=$(basename "$rule_file" .yml)
      rule_dir=$(basename "$(dirname "$rule_file")")
      result=$(cd "$REPO_ROOT" && sg scan --rule "$rule_file" src/ 2>&1) || true
      if [[ -n "$result" ]] && echo "$result" | grep -q '.'; then
        echo -e "${YELLOW}⚠ $rule_dir/$rule_name${NC}"
        echo "$result" | head -3
        ((ISSUES++)) || true
      else
        echo -e "${GREEN}✓ $rule_dir/$rule_name${NC}"
      fi
    fi
  done
else
  echo -e "${YELLOW}⚠ ast-grep (sg) 未安装。跳过自动模式扫描。${NC}"
  echo "  安装: npm install -g @ast-grep/cli"
fi
echo ""

# ── Layer 2: per-module grep 扫描 ──
echo "── Layer 2: per-module PITFALLS.md ──"

scan_module() {
  local module_dir="$1"
  local pitfall_file="$module_dir/PITFALLS.md"
  if [[ ! -f "$pitfall_file" ]]; then
    return 0
  fi
  local entry_count
  entry_count=$(grep -cE "^### (G|C|T|CLI|I|S|INT)-[0-9]+" "$pitfall_file" 2>/dev/null || echo "0")
  entry_count=$(echo "$entry_count" | tr -d '[:space:]')
  local active_count
  active_count=$(grep -c "^- \*\*状态\*\*: active" "$pitfall_file" 2>/dev/null || echo "0")
  active_count=$(echo "$active_count" | tr -d '[:space:]')
  if [[ "$entry_count" -gt 0 ]]; then
    echo -e "  ${GREEN}✓ $module_dir/${NC} (${entry_count} entries, ${active_count} active)"
  fi
}

# Always scan GLOBAL
scan_module "$SCRIPT_DIR"

# Scan target modules or all
if [[ -n "$TARGET_MODULE" ]]; then
  scan_module "$REPO_ROOT/$TARGET_MODULE"
else
  for dir in src/core src/cli src/templates src/schemas src/install src/integrations; do
    scan_module "$REPO_ROOT/$dir"
  done
fi
echo ""

# ── Summary ──
echo "── Summary ──"
if [[ $ISSUES -eq 0 ]]; then
  echo -e "${GREEN}✓ No pattern issues detected.${NC}"
  echo ""
  echo "Next: 人工检查触达模块的 PITFALLS.md 条目（grep 关键词搜索）。"
  echo "  示例: grep -r '关键词' src/*/PITFALLS.md .pitfalls/GLOBAL.md"
else
  echo -e "${RED}✗ ${ISSUES} pattern issue(s) found.${NC}"
  if $CI_MODE; then
    echo "CI mode: exiting with non-zero code."
    exit 1
  fi
fi
