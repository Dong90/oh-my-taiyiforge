# OMC 参考对照（非集成）

TaiyiForge **不依赖、也不引导安装** [oh-my-claudecode (OMC)](https://github.com/anthropics/oh-my-claudecode)。下列能力在设计上参考了 OMC 的控制面与交付纪律，**在本仓库内原生实现**。

日常只用 TaiyiForge 九阶段即可，无需任何 OMC 命令。

## 能力对照

| 参考来源（OMC） | TaiyiForge 实现 | 怎么用 |
|------------------|-----------------|--------|
| `state_get_status` | `/taiyi:status` · MCP `taiyi_state_get_status` · `status --json` | 用户说斜杠；Agent 代跑引擎 |
| `state_read` | MCP `taiyi_state_read` · 读 `state.json` | 无聊天斜杠 |
| `state_list_active` | `/taiyi:list` · MCP `taiyi_state_list_active` | slug 不明时先列变更 |
| notepad / checkpoint | `/taiyi:pause` → `HANDOFF.md` | 跨会话恢复 |
| project-memory | `/taiyi:remember` → `.taiyi/project-memory.json` | 跨变更模式/决策 |
| abort / cancel change | `/taiyi:cancel` · MCP `taiyi_state_cancel` | 放弃活跃变更 |
| cancel skill（模式） | `/taiyi:stop-mode` · 关键词 `stopomc` | 停止 ralph/autopilot/team 等 |
| 活跃模式列表 | `/taiyi:modes` | 读 `.taiyi/runtime/*-mode.json` |
| `omc doctor` | `/taiyi:doctor` | 升级后自检 |
| commit trailers | `/taiyi:commit` · delivery-gate | integration 前 commit |
| 交付门（须 commit 再关单） | `evaluateDeliveryGate` | `/taiyi:continue` integration 时启用 |
| OMC ralph + ralplan-first | `/taiyi:ralph` · `/taiyi:ralplan` | 验证循环 + 计划门禁 |
| OMC autopilot | `/taiyi:autopilot` | 九阶段 + orchestrator（须 `--auto`） |
| OMC team | `/taiyi:team` | plan → prd → exec → verify → fix |
| OMC ultrawork + spawn | `/taiyi:ultrawork` | 最多 6 路 spawn 计划 |
| OMC 专 Agent 池 | `/taiyi:agent <role>` | **29** 角色，见 `agent-roles.yaml` |
| OMC plan / ultraqa / … | `/taiyi:plan` · `/taiyi:ultraqa` · `/taiyi:visual-verdict` 等 | 见 `autonomous.md` |
| keyword-detector | `/taiyi:keyword` · Cursor/Claude hook（可选） | ralph/autopilot/ulw/team/ccg/deslop 等 |

详见 [autonomous.md](./autonomous.md)。

## 仍未 1:1 移植（IDE 宿主能力）

| OMC | 说明 |
|-----|------|
| Claude SDK `spawn_agent` | Taiyi 输出 **spawn 计划** + Cursor Task 示例协议；由 Cursor/Claude 宿主派发 |
| tmux team workers | 无 tmux MCP bridge；team 为状态机 + 泳道协议 |
| LSP MCP 工具 | 未内置；可用宿主 LSP |
| HUD / trace 面板 | 用 `/taiyi:modes` + `engineTruth` 替代 |

## 主流程（无 OMC）

```text
/taiyi:new → 写 md → /taiyi:continue → /taiyi:apply（dev/test）
→ review → git commit（带 Taiyi-Change trailer）→ integration → archive
```

Cursor 里用户说 **`/taiyi:status`**；机器/MCP 用 `status --json` 或 MCP（非用户必记）。

## 入口决策（四端 — 用户只说斜杠）

| 意图 | 用户说 |
|------|--------|
| 读状态 | `/taiyi:status` |
| 过关 | `/taiyi:continue` |
| 暂停 | `/taiyi:pause` |
| 放弃变更 | `/taiyi:cancel` |
| 停止模式 | `/taiyi:stop-mode` |
| integration 前 commit | `/taiyi:commit` |
| 自检 | `/taiyi:doctor` |
| PR/CI | `/taiyi:verify` |

详见 [`invoke.yaml`](./invoke.yaml) 的 `entry_decision` 块。

## 相关文档

- [workflow.md](./workflow.md) — 九阶段主流程
- [delivery-gate.md](./delivery-gate.md) — 交付门 + commit trailers
- [mcp-setup.md](./mcp-setup.md) — Cursor MCP 配置
- [control-plane.md](./control-plane.md) — 引擎 CLI
