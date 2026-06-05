# TaiyiForge CI 集成（四端）

CI 分两层：**无 LLM 校验**（每个 PR 都该跑）+ **可选 Agent 推进**（workflow_dispatch + API Key）。

## 命令

```bash
# PR 门禁：校验 .taiyi/changes/ 工件与 --auto 打卡
npx taiyi ci verify
npx taiyi ci verify --slug my-feature --require-complete

# 四端 skills 安装冒烟（隔离临时目录，不污染本机）
npx taiyi ci platform opencode
npx taiyi ci platform claude
npx taiyi ci platform codex
npx taiyi ci platform cursor

# 为当前阶段生成 Agent prompt（供 CI 或 cron 调用）
npx taiyi ci prompt my-feature
# → .taiyi/ci-prompts/my-feature-change.txt
```

仓库内快捷：

```bash
npm run ci:verify
npm run ci:platforms
```

## 业务仓库接入

1. 复制 `examples/ci/github-actions/taiyi-verify-pr.yml` → `.github/workflows/`
2. 按需复制四端之一：`taiyi-opencode.yml` / `taiyi-claude.yml` / `taiyi-codex.yml` / `taiyi-cursor.yml`
3. 在 GitHub Secrets 配置对应 API Key（仅 **advance** job 需要）

## 四端对照

| 端 | CI 无 LLM | CI 可选推进 | Secret |
|----|-----------|-------------|--------|
| **OpenCode** | `ci platform opencode` + `ci verify` | `opencode run` + `taiyi_*` 工具 | `OPENCODE_API_KEY` |
| **Claude** | 同上 | `claude -p "$(cat prompt)"` | `ANTHROPIC_API_KEY` |
| **Codex** | 同上 | `codex exec "$(cat prompt)"` | `OPENAI_API_KEY` |
| **Cursor** | 同上 | `cursor agent -p`（按本机 CLI 文档） | `CURSOR_API_KEY` |

## 推荐 PR 策略

| 场景 | 配置 |
|------|------|
| 仅文档/工件变更 | `taiyi ci verify` 必过 |
| auto 模式变更 | verify 会检查 harness 打卡与辅助工件 |
| 发版前 | `--require-complete` 要求 integration 已完成 |

## 与全自动 `--auto` 的关系

- **本地/IDE**：`init --auto` + `taiyi-orchestrator` Agent 循环
- **CI**：`ci verify` 防止半成品进 main；`ci prompt` + 平台 CLI 可在夜间 job 推进下一阶段

LLM 推进步骤在 CI 中为 **可选**（无 CLI/Key 时 skip，verify 仍绿）。
