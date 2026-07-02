<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-test.md -->
---
description: "TaiyiForge /taiyi:test — 测试域 umbrella · smoke / e2e / qa / ui / security"
argument-hint: "<smoke|e2e|qa|ui|security> [args]"
---
User invoked **$taiyi-test** (= `/taiyi:test $ARGUMENTS`). **测试域 umbrella · 按第一个词路由**：

| 子命令 | 说明 |
|--------|------|
| `smoke` | 内置 Playwright 冒烟（core/browser-smoke.ts） |
| `e2e` | 目标项目 `npx playwright test` |
| `qa` | gstack browse 走查 `/taiyi:gstack qa` |
| `ui` | test 阶段 UI 捷径 |
| `security` | semgrep + trivy 扫描 |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由：`smoke` → browser-smoke · `e2e` → playwright · `qa` → gstack · `ui` → 阶段 UI · `security` → 安全扫描
2. **Token 纪律**：全量 `playwright test` / probe 在 **CI 或后台**跑；聊天只写 `TEST.md` 摘要，**勿灌日志**

完整子命令地图：[canonical-commands.md §/taiyi:test 子命令地图](../docs/taiyi/canonical-commands.md)

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
