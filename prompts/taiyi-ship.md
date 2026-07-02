<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-ship.md -->
---
description: "TaiyiForge /taiyi:ship — gstack ship: test, review diff, push, open PR"
argument-hint: "[optional PR title hint]"
---
User invoked **$taiyi-ship** (= `/taiyi:ship`). **创建 PR 工作流** — 加载 **gstack `ship`** Skill，无 TaiyiForge 引擎子命令。

## 前置

```bash
scripts/taiyi-forge.sh status
scripts/taiyi-forge.sh verify
```

实现代码应已 commit；review 阶段建议已 `/taiyi:review-loop` 通过。

## 执行

1. 加载 **gstack `ship`**（见下方 gstack 加载协议）。
2. 按 ship Skill 完整流程：合并 base · 跑测试 · review diff · 必要时 bump VERSION/CHANGELOG · **push · 创建 PR**。
3. 不要跳过 ship Skill 直接 `gh pr create`（除非 ship 不可用且用户明确要求）。

PR 创建后：用户或 Agent 可用 `/taiyi:land` 合并与部署。

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

## gstack Skill 加载（四端）

1. **先** `/taiyi:status [slug]` — 确认变更 slug 与阶段（delivery 命令常发生在 review/integration 前后）。
2. **加载 gstack Skill**（按端）：
   - **Cursor**：`@gstack-<name>` 或 `@ship` / `@land-and-deploy`（若已安装 gstack bundle）
   - **Claude Code**：加载 `gstack` 包内对应 Skill（如 `ship`、`land-and-deploy`、`review`）
   - **Codex**：`$gstack-<name>` 或读 `~/.codex/skills/gstack/` 下 SKILL.md
3. **禁止**跳过 gstack Skill 直接 force-push / merge main；destructive git 须 gstack `careful` 或用户明确确认。
4. integration 交付门仍由 `/taiyi:continue` 校验（commit + trailer + 可选 `npm test`）；ship/land **不替代** TaiyiForge 过关。

未安装 gstack：`npx taiyi-forge-install --all`（或 `--skip-deps` 后手动 clone gstack）。
