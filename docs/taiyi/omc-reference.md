# OMC 参考对照（非集成）

TaiyiForge **不依赖、也不引导安装** [oh-my-claudecode (OMC)](https://github.com/anthropics/oh-my-claudecode)。下列能力在设计上参考了 OMC 的控制面与交付纪律，**在本仓库内原生实现**。

日常只用 TaiyiForge 九阶段即可，无需任何 OMC 命令。

## 能力对照

| 参考来源（OMC） | TaiyiForge 实现 | 怎么用 |
|------------------|-----------------|--------|
| `state_get_status` | `/taiyi:state` · `/taiyi:status` · MCP `taiyi_state_get_status` | 用户说斜杠；Agent 代跑引擎 |
| `state_read` | `/taiyi:state-read` · MCP `taiyi_state_read` | 读原始 `state.json` |
| `state_list_active` | `/taiyi:list` · MCP `taiyi_state_list_active` | slug 不明时先列变更 |
| notepad / checkpoint | `/taiyi:handoff` → `HANDOFF.md` | 跨会话恢复 |
| abort / cancel change | `/taiyi:cancel` · MCP `taiyi_state_cancel` | 放弃活跃变更 |
| `omc doctor` | `/taiyi:doctor` | 升级后自检 |
| commit trailers | `/taiyi:commit-trailers` · delivery-gate | integration 前 commit |
| 交付门（须 commit 再关单） | `evaluateDeliveryGate` | `/taiyi:continue` integration 时启用 |

## 主流程（无 OMC）

```text
/taiyi:new → 写 md → /taiyi:continue → /taiyi:apply（dev/test）
→ review → git commit（带 Taiyi-Change trailer）→ integration → archive
```

Cursor 里用户说 **`/taiyi:status`** 或 **`/taiyi:state`**；Agent 也可调 MCP（等价，非用户必记）。

## 入口决策（四端 — 用户只说斜杠）

| 意图 | 用户说 |
|------|--------|
| 读状态 | `/taiyi:status` · `/taiyi:state` |
| 过关 | `/taiyi:continue` |
| 暂停 | `/taiyi:handoff` |
| 放弃 | `/taiyi:cancel` |
| integration 前 commit | `/taiyi:commit-trailers` |
| 自检 | `/taiyi:doctor` |
| PR/CI | `/taiyi:verify` |

详见 [`invoke.yaml`](./invoke.yaml) 的 `entry_decision` 块。

## 相关文档

- [workflow.md](./workflow.md) — 九阶段主流程
- [delivery-gate.md](./delivery-gate.md) — 交付门 + commit trailers
- [mcp-setup.md](./mcp-setup.md) — Cursor MCP 配置
- [control-plane.md](./control-plane.md) — 引擎 CLI
