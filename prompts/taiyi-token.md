---
description: "TaiyiForge /taiyi:token — Token 预算 / 用量 / 压缩（umbrella · 4 子命令）"
argument-hint: "<status|record|scan|compress> [args]"
---
User invoked **$taiyi-token** (= `/taiyi:token $ARGUMENTS`). **Token 域 umbrella · 拆给 4 个子命令 prompt**：

| 子命令 | 真源 prompt | 引擎 CLI | 说明 |
|--------|------------|----------|------|
| `status` | `prompts/taiyi-token-status.md` | `taiyi-forge.sh token status [slug]` | 用量 / 预算 % / 阶段上限 |
| `record` | `prompts/taiyi-token-record.md` | `taiyi-forge.sh token record <slug> <n>` | 写入 `.token-usage.json` |
| `scan` | `prompts/taiyi-token-scan.md` | `taiyi-forge.sh token scan [slug]` | 扫各阶段已耗 / 阈值 |
| `compress` | `prompts/taiyi-token-compress.md` | `taiyi-forge.sh token compress <slug> [--dry-run]` | → `CONTEXT-COMPACT.md`（零 LLM，按 `##` 节截断） |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由到对应子命令 prompt（`@taiyi-token-status` · `@taiyi-token-record` · `@taiyi-token-scan` · `@taiyi-token-compress`）
2. 加载子命令 prompt 执行
3. 超阈值时优先 `compress`（`CONTEXT-COMPACT.md` 不进对话主窗）

**Token 纪律**（v28 控制面）：

- 清 slug → `/taiyi:archive` / `/taiyi:cancel … --remove-dir` / `prune --aborted`（对话只带 1 个 active）
- 压缩 → `/taiyi:token compress <slug>`（读 `CONTEXT-COMPACT.md`，勿全量工件）
- E2E → CI / 后台跑 `playwright` · `npm test` · probe（聊天只写 TEST.md 证据，不灌日志）

完整子命令地图：[canonical-commands.md §伞形命令·子命令地图](../docs/taiyi/canonical-commands.md)
