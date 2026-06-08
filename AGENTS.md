# TaiyiForge (oh-my-taiyiforge)

开源 AI 研发工作流：**OpenCode**（npm 插件）与 **Claude Code / Codex / Cursor**（`taiyi-*` Skills）共用同一套工件契约。

## 快速约定

1. 每个变更一个 slug：`.taiyi/changes/<slug>/`
2. 九阶段顺序见 `docs/taiyi/phases.yaml`，**上一阶段工件未完成不得进入下一阶段**
3. 完成阶段前须满足：**人工审批** + **质量门禁五维**（见 `docs/taiyi/quality-gate.yaml`）
4. 开发阶段（`taiyi-dev`）强制 **TDD**：先失败测试，再最小实现

## OpenCode

```bash
npm install oh-my-taiyiforge
```

在 `opencode.json` 中：

```json
{ "plugin": ["oh-my-taiyiforge"] }
```

日常用 **`taiyi_new`**（标题 → 自动 slug，对齐 `/taiyi:new`）；固定 slug / CI 用 `taiyi_init`。另有 `taiyi_complete` / `taiyi_continue` / `taiyi_handoff` / `taiyi_cancel` / `taiyi_commit_trailers` 等，聊天内可调，无需 shell。详见 `docs/opencode-setup.md`。

## Claude Code / Cursor / Codex（OMX 风格）

安装后各端同步 **18 个** `taiyi-*` Skill（含 `taiyi-forge` 引擎控制面 + `taiyi-orchestrator` + `taiyi-ultrawork` 等）。

```bash
npx taiyi-forge-install --all
# 或 --claude / --codex / --cursor
```

### 双轨调用（见 `docs/taiyi/invoke.yaml`）

| 层 | 做什么 | 怎么调 |
|----|--------|--------|
| **聊天** | 写工件、铁三角评审 | 加载 `taiyi-change` … `taiyi-integration`、Superpowers、gstack |
| **引擎** | init / harness / complete / 状态 | **Agent 代跑** `scripts/taiyi-forge.sh`（禁止让用户手打 `npx taiyi`） |

- **Codex**：`$taiyi-forge next <slug>` 或加载 `~/.codex/prompts/taiyi-forge.md`；暂停/放弃用 **`$taiyi-handoff`** / **`$taiyi-cancel`**
- **Claude**：加载 `taiyi-forge` Skill，Bash 代跑脚本（含 handoff / cancel / `doctor --strict-workspace`）
- **Cursor**：`taiyiforge.mdc` + `taiyi-forge` Skill + 终端工具（可选 MCP `taiyi-mcp`；`install --cursor` 会写 `.cursor/mcp.json` 模板）

可与 **oh-my-codex (OMX)** 并存：OMX 编排多 Agent，TaiyiForge 管阶段工件与门禁。

## 引擎 shell（CI / 脚本 / Agent 代跑）

```bash
scripts/taiyi-forge.sh init <slug> [--auto] --title "..."
scripts/taiyi-forge.sh new "标题"
scripts/taiyi-forge.sh next <slug>
scripts/taiyi-forge.sh harness <slug>
scripts/taiyi-forge.sh complete <slug> <phase>
```

全局安装：`taiyi-forge <cmd>` · 详见 `docs/taiyi/control-plane.md`

## 文档

- 架构：`docs/ARCHITECTURE.md`
- 双端配置：`docs/taiyi/agents.yaml`
- 贡献：`CONTRIBUTING.md`

## 许可

MIT — 见 `LICENSE`。
