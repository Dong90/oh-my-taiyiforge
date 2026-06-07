---
description: "TaiyiForge /taiyi:commit — git commit with Taiyi-Change trailers (pre-integration)"
argument-hint: "[slug] [subject line]"
---
User invoked **$taiyi-commit** (= `/taiyi:commit`). **Git 提交 + Taiyi 交付门对齐** — 无单独引擎子命令 beyond commit-trailers。

## 1. 生成 commit message

```bash
scripts/taiyi-forge.sh commit-trailers $ARGUMENTS
```

## 2. 执行 git（Agent 代跑，用户不手打）

- `git status` — 确认待提交文件
- `git add` 相关实现文件（**不要**提交 `.env`、密钥）
- `git commit` 使用上一步建议的 message（须含 `Taiyi-Change: <slug>`）

可选：加载 **gstack `careful`** 若涉及 force、reset 等危险操作。

## 3. 之后

- `/taiyi:verify` — PR 前工件门禁
- `/taiyi:ship` — 推分支 + 开 PR（gstack ship）
- integration 前：`/taiyi:continue`（交付门检查 commit + 干净工作区）

{{TAIYI_STAGE_PROTOCOL}}
