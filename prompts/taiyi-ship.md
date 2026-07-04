<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-ship.md -->
---
description: "TaiyiForge /taiyi:ship — git push + gh PR（delivery.yaml 驱动）"
argument-hint: "[optional PR title hint]"
---
User invoked **$taiyi-ship** (= `/taiyi:ship`). **创建 PR** — 按 `.taiyi/delivery.yaml` + `taiyi delivery-plan` 代跑。

## 1. 读计划（必须）

```bash
scripts/taiyi-forge.sh status [slug]
scripts/taiyi-forge.sh verify
scripts/taiyi-forge.sh delivery-plan [slug] --json
```

解析 `plan.steps` 中 `ship-*` 步骤；`kind: confirm` 须用户确认后再执行。

## 2. 执行 ship 步骤（Agent 代跑）

典型顺序（以 plan 为准）：

1. `ship` 段 `preCommands`（如 `npm test`）
2. `git push -u origin HEAD`（若 `ship.push: true`）
3. `gh pr create ...`（若 `ship.provider: gh` 且本机有 `gh`）
4. 无 `gh` 或 `provider: manual` → 提示用户手动开 PR

配置真源：`docs/taiyi/delivery.yaml` · 项目覆盖：`.taiyi/delivery.yaml` · 说明：`docs/taiyi/configuration.md`

PR 创建后：用户或 Agent 用 `/taiyi:land` 合并与部署。

## Agent 协议（必须遵守）

1. 只处理 **当前阶段** 工件（以 `/taiyi:status` 的 Skill/artifact 为准）；勿跳步写后续阶段 md。
2. **dev/test 之前禁止改业务代码**（`src/`、`app/` 等）；规划阶段只写 `.taiyi/changes/<slug>/` 下 md。
3. 每步：`/taiyi:status --json --compact` → 用户确认 → `/taiyi:continue --approver 名`（change/design/review 人工门）。
4. 以 **`engineTruth`** 为准（`status --json --compact`）；勿凭聊天记忆声称「已完成」。
5. 安装/交付排查：`doctor --json --compact` · `audit --json --compact`（勿全量 dump report）。
6. 全自动须显式 `/taiyi:new … --auto` 或 `TAIYI_AUTO_HARNESS=1`；**默认手动九阶段**。
7. 用户只说 **`/taiyi:*` 斜杠**；你代跑 `scripts/taiyi-forge.sh`，禁止让用户手打 shell。

## Token 纪律（必须遵守 · 省上下文）

1. **清 slug**：只保留 1 个 active。integration 完成后 **`/taiyi:archive`**；废弃用 **`/taiyi:cancel <slug> --remove-dir`**。
2. **archive 闭环**：九阶段/integration 完成后立刻 archive，再开 `/taiyi:new`。
3. **token compress**：长阶段后 **`/taiyi:token compress <slug>`**，优先读 `CONTEXT-COMPACT.md`。
4. **E2E 别在对话里跑**：全量测试 → CI/后台；聊天只写 TEST.md 摘要。

## 安全

- **禁止** `git push --force` 到 `main`/`master`（除非用户明确要求并确认）。
- integration 交付门仍由 `/taiyi:continue` 校验（commit + trailer + verify）；ship **不替代** TaiyiForge 过关。
