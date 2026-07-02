<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-workflow.md -->
---
description: "TaiyiForge /taiyi:workflow — 工作流扩展 umbrella · plan / ralplan / loop / sync 等"
argument-hint: "<plan|ralplan|loop|check|run|sync|ccg|sciomc|deepinit|remember|ultraqa|external-context|deep-interview|visual-verdict|ai-slop-cleaner|ecomode> [args]"
---
User invoked **$taiyi-workflow** (= `/taiyi:workflow $ARGUMENTS`). **工作流扩展 umbrella · 拆给 N 个子命令 prompt**：

| 子命令 | legacy 斜杠 | 真源 prompt | 说明 |
|--------|------------|------------|------|
| `plan` | `/taiyi:plan` | `prompts/taiyi-plan.md` | 写实施计划（bite-sized tasks） |
| `ralplan` | `/taiyi:ralplan` | `prompts/taiyi-ralplan.md` | plan + WIP 模式 |
| `loop` | `/taiyi:continue xN` | `prompts/taiyi-loop.md` | 循环 continue（`loop` 引擎仍可用） |
| `check` | `/taiyi:check` | `prompts/taiyi-check.md` | harness-check 单次 |
| `run` | `/taiyi:run` | `prompts/taiyi-run.md` | run harness Skill |
| `sync` | `/taiyi:sync` | `prompts/taiyi-sync.md` | sync wrapper / roles yaml |
| `ccg` | `/taiyi:ccg` | `prompts/taiyi-ccg.md` | code-change guard |
| `sciomc` | `/taiyi:sciomc` | `prompts/taiyi-sciomc.md` | sci-omc bridge |
| `deepinit` | `/taiyi:deepinit` | `prompts/taiyi-deepinit.md` | 深度 init（多轮项目扫描） |
| `remember` | `/taiyi:remember` | `prompts/taiyi-remember.md` | 写入 `.taiyi/memory/` |
| `ultraqa` | `/taiyi:ultraqa` | `prompts/taiyi-ultraqa.md` | ultra-QA（多维质量门禁） |
| `external-context` | `/taiyi:external-context` | `prompts/taiyi-external-context.md` | 外部上下文（PR/issue） |
| `deep-interview` | `/taiyi:deep-interview` | `prompts/taiyi-deep-interview.md` | 深度访谈（需求澄清） |
| `visual-verdict` | `/taiyi:visual-verdict` | `prompts/taiyi-visual-verdict.md` | 视觉评审 |
| `ai-slop-cleaner` | `/taiyi:ai-slop-cleaner` | `prompts/taiyi-ai-slop-cleaner.md` | AI 代码 slop 清理 |
| `ecomode` | `/taiyi:ecomode` | `prompts/taiyi-ecomode.md` | 经济模式（省 token） |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由到对应子命令 prompt
2. 加载对应 `@taiyi-{workflow 子命令}` Skill
3. 多数为 harness / 协议层辅助；与主链九阶段独立

完整子命令地图：[canonical-commands.md §/taiyi:workflow 子命令地图](../docs/taiyi/canonical-commands.md)

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
