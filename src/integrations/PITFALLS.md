# src/integrations/ PITFALLS

> OpenSpec / MCP / 外部集成专属。格式见 `.pitfalls/GLOBAL.md`。

### INT-001 · [arch] OpenSpec sync 前必须确认 openspec/ 目录存在

- **首发**: N/A · 2026-06-22
- **适用栈**: Node 20+
- **状态**: active
- **关键词**: openspec sync directory missing

**问题场景**
`.taiyi/archive/` 生成了完整工件，但 `openspec/changes/<slug>/` 目录不存在，调用 `taiyi_sync_openspec` 失败。

**试过的方案**
假设 openspec 目录总存在。

**为什么不行**
openspec 目录由用户手动 `openspec init` 创建。非 openspec 项目不需要这个目录。sync 时目录缺失应降级而非崩溃。

**正确做法**
- `sync_openspec()` 中先检查 `openspec/changes/` 是否存在
- 缺失时：输出 info log + 跳过同步（非 error）
- 提供 `--create-dir` 选项自动创建目录

**何时重新评估**
引入 `openspec init` 自动触发后。

### INT-002 · [ops] MCP server 的 env 变量不能从 CLI 命令行传递

- **首发**: N/A · 2026-06-22
- **适用栈**: Node 20+
- **状态**: active
- **关键词**: mcp env secrets cli security

**问题场景**
```bash
taiyi mcp start --env API_KEY=sk-xxx
```
API key 暴露在进程列表（`ps aux` 可见）。

**试过的方案**
用 CLI 参数 `--env` 传递敏感配置。

**为什么不行**
命令行参数对系统上所有用户可见（`/proc/<pid>/cmdline`）。API key、token 等敏感信息会泄露。

**正确做法**
- MCP server 配置用 JSON 文件（`.opencode/mcp.json`），权限 `600`
- 环境变量引用用 `${ENV_VAR}` 占位符，运行时从 `process.env` 读取
- 绝不在 CLI 参数中传递 secrets

**何时重新评估**
引入 secrets manager（如 Vault / 1Password CLI）后。
