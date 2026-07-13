<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-commit.md -->
---
description: "TaiyiForge /taiyi:commit — git commit with configured trailers (pre-integration)"
argument-hint: "[slug] [subject line]"
---
User invoked **$taiyi-commit** (= `/taiyi:commit`). **Git 提交 + 交付门对齐** — 模板来自 `.taiyi/delivery.yaml`。

## 1. 生成 commit message

```bash
scripts/taiyi-forge.sh commit-trailers $ARGUMENTS
```

使用输出 `suggestion`（subject + 配置的 requiredTrailers）。

## 2. 执行 git（Agent 代跑）

- `git status` — 确认待提交文件
- `git add` 相关实现文件（**不要**提交 `.env`、密钥）
- `git commit` 使用上一步 message

危险操作（force、reset）须用户明确确认。

## 3. 之后

- `/taiyi:verify`
- `/taiyi:ship` — 见 `delivery-plan` 的 ship 段
- integration：`/taiyi:continue`（交付门：commit + 干净工作区 + verify）

配置说明：`docs/taiyi/configuration.md`

## Agent 协议（必须遵守）

1. 只处理 **当前阶段** 工件。
2. **dev/test 之前禁止改业务代码**。
3. `/taiyi:status --json --compact` → 用户确认 → `/taiyi:continue --approver 名`。
4. 以 **`engineTruth`** 为准。
5. 用户只说 **`/taiyi:*` 斜杠**；你代跑 `scripts/taiyi-forge.sh`。

## Token 纪律

archive · compress · E2E 走 CI（同 ship/land）。
