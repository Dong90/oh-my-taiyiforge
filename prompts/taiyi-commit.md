<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-commit.md -->
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
