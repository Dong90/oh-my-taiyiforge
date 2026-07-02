<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-review.md -->
---
description: "TaiyiForge /taiyi:review — Review 域 umbrella · loop / check / health / gstack"
argument-hint: "<loop|check|health|gstack> [args]"
---
User invoked **$taiyi-review** (= `/taiyi:review $ARGUMENTS`). **Review 域 umbrella · 拆给 4 个子命令 prompt**：

| 子命令 | legacy 斜杠 | 真源 prompt | 说明 |
|--------|------------|------------|------|
| `loop` | `/taiyi:review-loop` | `prompts/taiyi-review-loop.md` | review 闭环循环（直到绿或 stopomc） |
| `check` | `/taiyi:review-check` | `prompts/taiyi-review-check.md` | 单次 review 校验 |
| `health` | `/taiyi:health` | `prompts/taiyi-health.md` | 代码健康基线（→ `health-report.md`） |
| `gstack` | `/taiyi:gstack review` | `prompts/taiyi-gstack-review.md` | gstack 跨 AI review |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由到对应子命令 prompt
2. 加载 `@taiyi-review-loop` · `@taiyi-review-check` · `@taiyi-health` · `@taiyi-gstack-review`
3. `loop` 进入 review 闭环模式（跨轮直到绿或 `stopomc`）
4. 高优 finding 必修；中优 warn-only

完整子命令地图：[canonical-commands.md §/taiyi:review 子命令地图](../docs/taiyi/canonical-commands.md)

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
