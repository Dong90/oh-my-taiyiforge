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

重启 Cursor 后，Agent 应能看到五个工具。

## 工具

### `taiyi_state_get_status`

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

| 场景 | 优先 |
|------|------|
| 读状态 / 列变更 / handoff / cancel | MCP |
| `continue` / `complete` / 门禁 | **仍用** `scripts/taiyi-forge.sh`（MCP 不代过关） |

## 调试

```bash
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

## 相关

- [omc-reference.md](./omc-reference.md) — 设计参考对照（非集成）
- [control-plane.md](./control-plane.md)
