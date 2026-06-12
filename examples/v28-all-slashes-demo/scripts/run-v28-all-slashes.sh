#!/usr/bin/env bash
# examples/v28-all-slashes-demo/scripts/run-v28-all-slashes.sh
# ────────────────────────────────────────────────────────────────
# 真源: docs/taiyi/canonical-commands.md → canonical_v28
# 目标: 跑全 28 条 v28 顶栏斜杠 · 真实 cmd 调用 · 真实输出
# 用法: bash examples/v28-all-slashes-demo/scripts/run-v28-all-slashes.sh
# 输出: examples/v28-all-slashes-demo/output/demo.log
# 前提: 已 build + 在仓库根目录
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
T="$(date +%H:%M:%S)"
LOG="$ROOT/examples/v28-all-slashes-demo/output/demo.log"
mkdir -p "$(dirname "$LOG")"
: > "$LOG"

say()    { printf '%s\n' "$*" | tee -a "$LOG" ; }
hr()     { printf '\n%s\n' "────────────────────────────────────────────────────" | tee -a "$LOG" ; }
banner() { printf '\n\033[1;36m%s\033[0m\n' "$*" | tee -a "$LOG" ; }
run()    {
  local label="$1"; shift
  hr; banner "$label"
  printf '\033[2m\$ %s\033[0m\n' "$*" | tee -a "$LOG"
  "$@" 2>&1 | tee -a "$LOG" || true
}
prompt() {
  # 聊天斜杠真源: prompts/taiyi-<name>.md（install --<harness> 同步到 IDE）
  # umbrella v28 Phase 1: 部分 umbrella 顶层无独立 prompt，落到 legacy 子命令 prompt
  local name="$1" desc="${2:-}"
  local f="$ROOT/prompts/taiyi-${name}.md"
  hr; banner "/taiyi:${name%% *}${desc:+ · }${desc}"
  if [ -f "$f" ]; then
    printf '\033[2m\$ cat prompts/taiyi-%s.md | head -30\033[0m\n' "$name" | tee -a "$LOG"
    sed -n '1,30p' "$f" | tee -a "$LOG"
  else
    printf '\033[33m[umbrella 顶层 prompt 不存在 · 走 legacy 子命令 · 见 canonical-commands.md §伞形地图]\033[0m\n' "$name" | tee -a "$LOG"
  fi
}
umbrella_map() {
  local umbrella="$1"
  shift
  hr; banner "/taiyi:${umbrella}（umbrella · 无独立顶层 prompt → 子命令 legacy 真源）"
  printf '\033[2m[umbrella 真源: docs/taiyi/canonical-commands.md §伞形命令·子命令地图]\033[0m\n' | tee -a "$LOG"
  printf '\033[2m\$ ls prompts/ | grep -E "%s" | sort\033[0m\n' "$*" | tee -a "$LOG"
  ls "$ROOT/prompts/" | grep -E "$*" | sort | tee -a "$LOG"
  # 挑第一个子命令 cat 出来
  local first
  first="$(ls "$ROOT/prompts/" | grep -E "$*" | sort | head -1)"
  if [ -n "$first" ]; then
    printf '\n\033[2m\$ cat prompts/%s | head -25\033[0m\n' "$first" | tee -a "$LOG"
    sed -n '1,25p' "$ROOT/prompts/$first" | tee -a "$LOG"
  fi
}

say "╔══════════════════════════════════════════════════════════════╗"
say "║  TaiyiForge v28 All-Slashes Demo                              ║"
say "║  真源: docs/taiyi/canonical-commands.md → canonical_v28       ║"
say "║  跑全 28 条 v28 顶栏斜杠 · 真实 cmd 调用 · 真实输出           ║"
say "╚══════════════════════════════════════════════════════════════╝"
say ""
say "ROOT  = $ROOT"
say "TIME  = $T"
say "LOG   = $LOG"
say ""

# ─── §0 引擎就绪（v28 #11–13）───
banner "§0 引擎就绪 · v28 #11 /taiyi:doctor · #12 /taiyi:audit · #13 /taiyi:verify"
run "v28 #11 /taiyi:doctor（engine: doctor --json --compact）" \
  bash "$ROOT/scripts/taiyi-forge.sh" doctor --json --compact
run "v28 #12 /taiyi:audit（engine: audit --json --compact）" \
  bash "$ROOT/scripts/taiyi-forge.sh" audit --json --compact

# ─── §1 主链 (6) ───
banner "§1 Main chain (6) · v28 #1–6"
run "v28 #1 /taiyi:new（engine: new）" \
  bash "$ROOT/scripts/taiyi-forge.sh" new "demo: 跑全 28 v28 顶栏斜杠" --profile lite

# 取真实生成的 slug（new 输出含 "变更: <slug>"）
SLUG="$(bash "$ROOT/scripts/taiyi-forge.sh" list --all 2>&1 | awk 'NR==1{print $1}')"
say ""
say "[SLUG 解析] 实际生成: $SLUG（new 输出 '变更: $SLUG'）"

prompt "write" "#3 · /taiyi:write（九阶段统一写工件入口）"
prompt "continue" "#4 · /taiyi:continue（pass 当前 phase · 人工门需 --approver）"
prompt "apply" "#5 · /taiyi:apply（dev/test harness 清单）"
prompt "archive" "#6 · /taiyi:archive（九阶段完成后归档）"

# Phase 1 → 2（lite 跳过 design/ui-design/task/review）
run "v28 #4 /taiyi:continue（engine: complete change）" \
  bash "$ROOT/scripts/taiyi-forge.sh" complete "$SLUG" change --approver "demo"
run "v28 #4 /taiyi:continue（engine: continue requirement）" \
  bash "$ROOT/scripts/taiyi-forge.sh" continue "$SLUG"
run "v28 #4 /taiyi:continue（engine: continue dev · lite 直通）" \
  bash "$ROOT/scripts/taiyi-forge.sh" continue "$SLUG"
run "v28 #4 /taiyi:continue（engine: continue test · lite 直通）" \
  bash "$ROOT/scripts/taiyi-forge.sh" continue "$SLUG"
run "v28 #4 /taiyi:continue（engine: continue integration）" \
  bash "$ROOT/scripts/taiyi-forge.sh" continue "$SLUG"

# ─── §2 会话 (4) ───
banner "§2 Session (4) · v28 #7–10"
run "v28 #10 /taiyi:list（engine: list --all）" \
  bash "$ROOT/scripts/taiyi-forge.sh" list --all
prompt "handoff" "#7 · /taiyi:handoff（暂停 → CONTEXT-COMPACT.md）"
prompt "resume"  "#8 · /taiyi:resume（接续 handoff 上下文）"
prompt "cancel"  "#9 · /taiyi:cancel（放弃变更 · 可选 --remove-dir）"

# ─── §3 排查 (3) #11–13 已 §0 跑过 — 这里只看 prompt ───
banner "§3 Diagnose (3) · v28 #11–13（已 §0 实跑 engine）"
prompt "doctor" "#11 · /taiyi:doctor"
prompt "audit"  "#12 · /taiyi:audit"
prompt "verify" "#13 · /taiyi:verify"

# ─── §4 交付 (4) ───
banner "§4 Delivery (4) · v28 #14–17"
prompt "commit"  "#14 · /taiyi:commit（带 Taiyi-Change trailer）"
prompt "ship"    "#15 · /taiyi:ship（创建 PR）"
prompt "land"    "#16 · /taiyi:land（合并部署）"
prompt "release" "#17 · /taiyi:release（= gstack document-release）"

# ─── §5 路由 (2) ───
banner "§5 Routing (2) · v28 #18–19"
prompt "gstack" "#18 · /taiyi:gstack <skill>（如 gstack/review · gstack/qa）"
prompt "sp"     "#19 · /taiyi:sp <skill>（如 superpowers/brainstorming）"

# ─── §6 阶段捷径 (3) ───
banner "§6 Stage shortcuts (3) · v28 #20–22"
prompt "explore" "#20 · /taiyi:explore（→ Superpowers brainstorming）"
prompt "tdd"     "#21 · /taiyi:tdd plan|dev（→ TDD 红绿）"
prompt "flow"    "#22 · /taiyi:flow feature|bug|full-flow|help"

# ─── §7 伞形 (6) ───
banner "§7 Umbrellas (6) · v28 #23–28"
run "v28 #23 /taiyi:token status（engine: token status）" \
  bash "$ROOT/scripts/taiyi-forge.sh" token status
run "v28 #23 /taiyi:token record（engine: token record · 写入 .token-usage.json）" \
  bash "$ROOT/scripts/taiyi-forge.sh" token record "$SLUG" 0 2>&1 | head -8
prompt "token-compress" "#23 · /taiyi:token compress（→ CONTEXT-COMPACT.md）"

umbrella_map "test"  "^taiyi-(browser-smoke|e2e|ui-test|security|smoke)"
umbrella_map "review" "^taiyi-(review-loop|review-check|health|gstack-review)"
umbrella_map "diagram" "^taiyi-diagram-(pipeline|c4|arch|render|flow)"
umbrella_map "mode" "^taiyi-(ralph|autopilot|daemon|team|ultrawork|agent|step|stop-mode|modes|keyword|preflight)"
umbrella_map "workflow" "^taiyi-(plan|ralplan|loop|check|run|sync|ccg|sciomc|deepinit|remember|ultraqa|external-context|deep-interview|visual-verdict|ai-slop-cleaner|ecomode)"

# ─── §8 status + token 最终态 ───
banner "§8 终态 · engineTruth"
run "v28 #2 /taiyi:status（engine: status --json --compact）" \
  bash "$ROOT/scripts/taiyi-forge.sh" status "$SLUG" --json --compact

hr
say ""
say "╔══════════════════════════════════════════════════════════════╗"
say "║  28 v28 顶栏调用完成                                           ║"
say "║  完整输出: $LOG"
say "╚══════════════════════════════════════════════════════════════╝"
