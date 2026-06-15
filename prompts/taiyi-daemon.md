---
description: "TaiyiForge /taiyi:daemon — 无人 Agent 闭环（引擎 step + 外部 LLM CLI）"
argument-hint: "run <slug> [--engine-only] [--dry-run] [--force] | status [slug]"
---
User invoked **$taiyi-daemon** (= `/taiyi:daemon`). **Unattended closed loop — engine step/loop + optional codex/claude/cursor exec.**

```bash
scripts/taiyi-forge.sh daemon run $ARGUMENTS
# 或仅看状态:
scripts/taiyi-forge.sh daemon status $ARGUMENTS
```

## Prerequisites

- Active change with **autoHarness** (`/taiyi:new … --auto` or `init <slug> --auto`)
- For full loop (not `--engine-only`): `TAIYI_DAEMON_PLATFORM` or `TAIYI_DAEMON_AGENT_CMD` on PATH

## Agent 代跑（聊天内）

1. **终端长跑**：用 Shell 工具后台跑 `daemon run <slug>`（勿让用户手打）
2. 阻塞且未配 `--engine-only` 时，daemon 会 **exec** 外部 Agent CLI；聊天 Agent 也可在 daemon 等待期间按 harness 清单写工件
3. 查进度：`scripts/taiyi-forge.sh daemon status <slug>`
4. 停止：`/taiyi:stop-mode`

## vs autopilot / step

| `/taiyi:autopilot` + `/taiyi:step` | `/taiyi:daemon` |
|-----------------------------------|-----------------|
| 聊天内单步，靠你或 Task 子 Agent | 终端循环，阻塞时 exec LLM CLI |
| `/taiyi:loop` 只引擎 continue | daemon = step + loop + Agent 调用 |

环境变量：`TAIYI_DAEMON_MAX_ROUNDS` · `TAIYI_DAEMON_INTERVAL_MS` · `TAIYI_AUTO_HUMAN`（CI 跳过人工门）

详见 `docs/taiyi/autonomous.md`
