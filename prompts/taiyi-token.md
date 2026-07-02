<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-token.md -->
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

## Agent 协议（必须遵守）

1. 只处理 **当前阶段** 工件（以 `/taiyi:status` 的 Skill/artifact 为准）；勿跳步写后续阶段 md。
2. **dev/test 之前禁止改业务代码**（`src/`、`app/` 等）；规划阶段只写 `.taiyi/changes/<slug>/` 下 md。
3. 每步：`/taiyi:status --json --compact` → 用户确认 → `/taiyi:continue --approver 名`（change/design/review 人工门）。
4. 以 **`engineTruth`** 为准（`status --json --compact`）；勿凭聊天记忆声称「已完成」。
5. 安装/交付排查：`doctor --json --compact` · `audit --json --compact`（勿全量 dump report）。
6. 全自动须显式 `/taiyi:new … --auto` 或 `TAIYI_AUTO_HARNESS=1`；**默认手动九阶段**。
7. 用户只说 **`/taiyi:*` 斜杠**；你代跑 `scripts/taiyi-forge.sh`，禁止让用户手打 shell。

## Token 纪律（必须遵守 · 省上下文）

1. **清 slug**：只保留 1 个 active。integration 完成后 **`/taiyi:archive`**；废弃用 **`/taiyi:cancel <slug> --remove-dir`**；探针/演示 slug 归档或取消，勿堆在对话上下文里。
2. **archive 闭环**：九阶段/integration 完成后立刻 archive，再开 `/taiyi:new`；勿在 completed 变更上继续聊。
3. **token compress**：长阶段后或进入 dev 前跑 **`/taiyi:token compress <slug>`**，后续优先读 `CONTEXT-COMPACT.md`，勿全量读 CHANGE…CHANGELOG 进聊天。
4. **E2E 别在对话里跑**：`playwright test`、`npm test`、全量 walkthrough、probe 套件 → **CI / 后台终端**执行；聊天里只把命令+exit+摘要写入 **TEST.md**，禁止把整段测试日志灌进对话。
