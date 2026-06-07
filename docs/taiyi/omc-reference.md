# OMC 参考对照（非集成）

TaiyiForge **不依赖、也不引导安装** [oh-my-claudecode (OMC)](https://github.com/anthropics/oh-my-claudecode)。下列能力在设计上参考了 OMC 的控制面与交付纪律，**在本仓库内原生实现**。

日常只用 TaiyiForge 九阶段即可，无需任何 OMC 命令。

## 能力对照

| 参考来源（OMC） | TaiyiForge 实现 | 怎么用 |
|------------------|-----------------|--------|
| `state_get_status` | MCP `taiyi_state_get_status` · `status --json` 的 `engineTruth` | Agent 读解读后的真源 |
| `state_read` | MCP `taiyi_state_read` | 读原始 `state.json`（只读） |
| `state_list_active` | MCP `taiyi_state_list_active` · `taiyi list` | slug 不明时先列 active 变更 |
| notepad / checkpoint | `/taiyi:handoff` → `HANDOFF.md` | 跨会话恢复 |
| abort / cancel change | MCP `taiyi_state_cancel` · `/taiyi:cancel` | 放弃活跃变更 |
| `omc doctor` | `/taiyi:doctor`（安装 + 工作区流程） | 升级后自检 |
| commit trailers | `Taiyi-Change` / `Taiyi-Phase` · delivery-gate | 见 [delivery-gate.md](./delivery-gate.md) |
| 交付门（须 commit 再关单） | `evaluateDeliveryGate` | `complete integration` 时默认启用 |

## 主流程（无 OMC）

```text
/taiyi:new → 写 md → /taiyi:continue → /taiyi:apply（dev/test）
→ review → git commit（带 Taiyi-Change trailer）→ integration → archive
```

Cursor 里优先 MCP `taiyi_state_get_status`，不必手打 shell。

## 入口决策（四端）

| 意图 | Cursor | OpenCode | Claude / Codex |
|------|--------|----------|----------------|
| 读状态 | MCP `taiyi_state_*` | `taiyi_status` / `taiyi_list` | `/taiyi:status` 或 shell |
| 过关 | shell `continue` | `taiyi_continue` | shell / prompt |
| 暂停 | MCP `taiyi_state_handoff` | `taiyi_handoff` | `/taiyi:handoff` |
| 放弃 | MCP `taiyi_state_cancel` | `taiyi_cancel` | `/taiyi:cancel` |
| integration 前 commit | shell `commit-trailers` | `taiyi_commit_trailers` | 同 shell |
| 自检 | `npm run taiyi:doctor` | `taiyi_doctor` strict | `doctor --strict-workspace` |

详见 [`invoke.yaml`](./invoke.yaml) 的 `entry_decision` 块。

## 相关文档

- [workflow.md](./workflow.md) — 九阶段主流程
- [delivery-gate.md](./delivery-gate.md) — 交付门 + commit trailers
- [mcp-setup.md](./mcp-setup.md) — Cursor MCP 配置
- [control-plane.md](./control-plane.md) — 引擎 CLI
