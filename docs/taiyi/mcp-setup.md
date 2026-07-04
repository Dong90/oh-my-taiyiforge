# TaiyiForge MCP（Cursor / Claude Code / Claude Desktop）

对标 OMC 的 `state_get_status` / `state_list_active`（**参考实现，不要求安装 OMC**），让 Agent **直接调 MCP** 读 `.taiyi/changes/` 引擎真源，而不必记 `scripts/taiyi-forge.sh`。

## 安装

```bash
npm install oh-my-taiyiforge
# 或 monorepo 内 npm run build
```

MCP 入口（stdio）：

```bash
npx taiyi-mcp
# 或 node node_modules/oh-my-taiyiforge/dist/mcp/server.js
```

环境变量：

| 变量 | 说明 |
|------|------|
| `TAIYI_WORKSPACE` | 项目根（默认 `process.cwd()`） |

## Codex / Claude Code 全局 MCP

`npx taiyi-forge-install --codex` / `--claude` 会写入：

| 端 | 路径 |
|----|------|
| Codex | `~/.codex/mcp.json` |
| Claude Code | `~/.claude/mcp.json` |

入口为 `npx -y oh-my-taiyiforge taiyi-mcp`。在项目根启动 Agent，或设 `TAIYI_WORKSPACE=/path/to/project`。跳过：`TAIYI_FORGE_SKIP_MCP=1`。

## Claude Desktop（与 Claude Code 不同）

Claude **Desktop 应用**不读 `~/.claude/mcp.json`，而使用独立配置文件：

| 系统 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

在 `mcpServers` 中手动添加（将 `YOUR_PROJECT` 换成实际路径）：

```json
{
  "mcpServers": {
    "taiyi-forge": {
      "command": "npx",
      "args": ["-y", "oh-my-taiyiforge", "taiyi-mcp"],
      "env": {
        "TAIYI_WORKSPACE": "/absolute/path/to/YOUR_PROJECT"
      }
    }
  }
}
```

Monorepo / 本地开发可改为 `node` + 绝对路径指向 `dist/mcp/server.js`。修改后**完全退出并重启 Claude Desktop**。

> **Claude Code**（终端 / IDE 插件）用 `~/.claude/mcp.json` + 项目 `.claude/settings.json` hook；**Claude Desktop** 仅 MCP，无 PreToolUse hook。

## Cursor 配置

在项目 `.cursor/mcp.json` 或 Cursor Settings → MCP：

```json
{
  "mcpServers": {
    "taiyi-forge": {
      "command": "node",
      "args": ["node_modules/oh-my-taiyiforge/dist/mcp/server.js"],
      "env": {
        "TAIYI_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

Monorepo / 本地开发：

```json
{
  "mcpServers": {
    "taiyi-forge": {
      "command": "node",
      "args": ["/absolute/path/to/oh-my-taiyiforge/dist/mcp/server.js"],
      "env": {
        "TAIYI_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

重启 Cursor 后，Agent 应能看到 **16 个** MCP 工具（状态 5 + 排查 2 + 模式 3 + remember/keyword/workflow + LSP 3）。

## 工具

### 状态（5）

| MCP | 说明 |
|-----|------|
| `taiyi_state_get_status` | `{ slug? }` → engineTruth + statusLine |
| `taiyi_state_read` | 原始 `state.json` |
| `taiyi_state_list_active` | 全部变更 + active |
| `taiyi_state_handoff` | 写 HANDOFF.md |
| `taiyi_state_cancel` | 中止变更 |

### 排查（2）— slim JSON，对齐 CLI `--json --compact`

| MCP | CLI 等价 | 说明 |
|-----|----------|------|
| `taiyi_doctor` | `doctor --json --compact` | 安装 + 工作区；`strictWorkspace: true` 作 CI 门 |
| `taiyi_audit` | `audit --json --compact` | 流程/交付；仅 high findings |
| `taiyi_delivery_plan` | `delivery-plan --json` | 预览 delivery.yaml 交付链（commit → ship → land） |

### 模式（3）— 与 OpenCode `taiyi_step` / `taiyi_stop_mode` / `taiyi_modes` 对齐

| MCP | OpenCode | 说明 |
|-----|----------|------|
| `taiyi_mode_step` | `taiyi_step` | ralph/autopilot/ultrawork/team 单步 |
| `taiyi_mode_stop` | `taiyi_stop_mode` | 取消活跃模式 |
| `taiyi_mode_list` | `taiyi_modes` | 列出 `.taiyi/runtime/*-mode.json` |

### OMC 对齐（3）

| MCP | OpenCode | 说明 |
|-----|----------|------|
| `taiyi_remember` | `taiyi_remember` | `.taiyi/project-memory.json` |
| `taiyi_keyword` | `taiyi_keyword` | ralph/autopilot/team/ccg/deslop/**ultrathink**/**deepsearch** 等口头触发 |
| `taiyi_workflow` | `taiyi_workflow` | plan/ralplan/ultraqa/ccg/sciomc/deepinit/**external-context** |

### LSP 轻量封装（3）

非真 LSP Server；`TAIYI_LSP=off` 跳过 diagnostics。无 IDE LSP 时用 grep 回退。

| MCP | 说明 |
|-----|------|
| `taiyi_lsp_diagnostics` | `npm run typecheck/lint` 或 `tsc --noEmit` |
| `taiyi_lsp_goto_definition` | 符号 grep 候选定义 |
| `taiyi_lsp_find_references` | 同 goto（文本匹配） |

### `taiyi_state_get_status`（详情）

- **输入：** `{ "slug": "optional" }`
- **输出：** `{ engineTruth, statusLine }` — 与 `taiyi status --json` 的 `engineTruth` 一致

### `taiyi_state_read`

- **输入：** `{ "slug": "optional" }`
- **输出：** 原始 `state.json` 内容与磁盘路径（只读；不含 blockers 解读）

### `taiyi_state_list_active`

- **输出：** 全部变更 + `active` 列表 + 单变更时可推断的 `inferredSlug`

### `taiyi_state_handoff`

- **输入：** `{ "slug": "optional", "note": "会话备注" }`
- **输出：** 写入 `HANDOFF.md` 的路径与更新后的 `engineTruth`

### `taiyi_state_cancel`

- **输入：** `{ "slug": "optional" }`
- **输出：** `{ ok, slug, workflowStatus: "aborted" }` — 对齐 `/taiyi:cancel` 与 OpenCode `taiyi_cancel`

## 与 shell 的关系

| 场景 | 用户说 | Agent 代跑 |
|------|--------|------------|
| 读状态 | `/taiyi:status` · MCP `taiyi_state_get_status` | `taiyi-forge.sh status [--json] [--compact]` |
| 安装/交付排查 | `/taiyi:doctor` · `/taiyi:audit` · MCP `taiyi_doctor` / `taiyi_audit` | `doctor|audit --json --compact` |
| handoff / cancel | `/taiyi:pause` · `/taiyi:cancel` | 同左映射 |
| 过关 / 门禁 | `/taiyi:continue` · `/taiyi:complete` | `taiyi-forge.sh …` |
| CI（无聊天） | — | `taiyi ci verify` |

MCP 工具与斜杠等价：用户不必记 MCP 名；Cursor Agent 可选用 MCP 或斜杠。

## 调试

```bash
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

## 相关

- [control-plane.md](./control-plane.md)
