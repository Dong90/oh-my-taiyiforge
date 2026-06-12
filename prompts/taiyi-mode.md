---
description: "TaiyiForge /taiyi:mode — 多 Agent / OMC umbrella · ralph / autopilot / ultrawork 等 11 子命令"
argument-hint: "<ralph|autopilot|ultrawork|daemon|team|agent|step|stop-mode|modes|keyword|preflight> [args]"
---
User invoked **$taiyi-mode** (= `/taiyi:mode $ARGUMENTS`). **多 Agent / OMC umbrella · 拆给 11 个子命令 prompt**：

| 子命令 | legacy 斜杠 | 真源 prompt | 说明 |
|--------|------------|------------|------|
| `ralph` | `/taiyi:ralph` | `prompts/taiyi-ralph.md` | WIP 模式（防 Agent 退场） |
| `autopilot` | `/taiyi:autopilot` | `prompts/taiyi-autopilot.md` | 自治：discuss→plan→execute per phase |
| `ultrawork` | `/taiyi:ultrawork` | `prompts/taiyi-ultrawork.md` | 并行切片 + Cursor Task 派发 |
| `daemon` | `/taiyi:daemon` | `prompts/taiyi-daemon.md` | dry-run 守护 |
| `team` | `/taiyi:team` | `prompts/taiyi-team.md` | 状态机 + 泳道协议 |
| `agent` | `/taiyi:agent` | `prompts/taiyi-agent.md` | 29 专 Agent 角色 |
| `step` | `/taiyi:step` | `prompts/taiyi-step.md` | 单步推进（手动 gate） |
| `stop-mode` | `/taiyi:stop-mode` | `prompts/taiyi-stop-mode.md` | 退出活跃模式 |
| `modes` | `/taiyi:modes` | `prompts/taiyi-modes.md` | 列活跃模式 |
| `keyword` | `/taiyi:keyword` | `prompts/taiyi-keyword.md` | 关键词识别 |
| `preflight` | `/taiyi:preflight` | `prompts/taiyi-preflight.md` | Codex 端 keyword + reminder |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由到对应子命令 prompt
2. 加载对应 `@taiyi-{mode 子命令}` Skill
3. OMC 关键词命中（ralph/autopilot/ultrawork 等）走 Cursor/Claude hook；Codex 走 `/taiyi:mode preflight` 或 `keyword`
4. **退出**：收到 `stopomc` 后自动 `step` 出 loop

完整子命令地图：[canonical-commands.md §/taiyi:mode 子命令地图](../docs/taiyi/canonical-commands.md) · [autonomous.md](../docs/taiyi/autonomous.md) · [omc-reference.md](../docs/taiyi/omc-reference.md)
