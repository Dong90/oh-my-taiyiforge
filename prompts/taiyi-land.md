<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-land.md -->
---
description: "TaiyiForge /taiyi:land — merge PR + 部署验证（delivery.yaml 驱动）"
argument-hint: "[optional PR number or branch]"
---
User invoked **$taiyi-land** (= `/taiyi:land`). **合并 + 部署 + 健康检查** — 按 `delivery-plan` 代跑。

## 1. 读计划（必须）

```bash
scripts/taiyi-forge.sh status [slug]
scripts/taiyi-forge.sh delivery-plan [slug] --json
```

解析 `plan.steps` 中 `land-*` 步骤；`requireConfirm` 含 `land` 时须用户确认。

## 2. 执行 land 步骤（Agent 代跑）

典型顺序（以 plan 为准）：

1. `gh pr checks --watch`（若 `land.waitCi: true`）
2. `gh pr merge --squash|--merge|--rebase`（若 `land.provider: gh`）
3. `land.postMergeCommands` 自定义脚本
4. `curl` 健康检查（若配置了 `land.healthUrl`）
5. `provider: manual` → 提示用户手动 merge / 部署

## 3. 之后

- `/taiyi:continue` integration（若尚未）
- `/taiyi:archive <slug>`

配置：`docs/taiyi/configuration.md`

## Agent 协议（必须遵守）

1. 只处理 **当前阶段** 工件（以 `/taiyi:status` 为准）。
2. **dev/test 之前禁止改业务代码**；规划阶段只写 `.taiyi/changes/<slug>/` 下 md。
3. 每步：`/taiyi:status --json --compact` → 用户确认 → `/taiyi:continue --approver 名`。
4. 以 **`engineTruth`** 为准；勿凭聊天记忆声称「已完成」。
5. `doctor --json --compact` · `audit --json --compact` 排查。
6. 用户只说 **`/taiyi:*` 斜杠**；你代跑 `scripts/taiyi-forge.sh`。

## Token 纪律

同 `/taiyi:ship` — archive · compress · E2E 走 CI。

## 安全

- merge / deploy 前确认 PR 与 CI 状态。
- **禁止** force-push 到保护分支。
