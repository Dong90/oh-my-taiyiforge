---
name: taiyi-forge
description: TaiyiForge 引擎控制面 — 用户只说 /taiyi:* 斜杠，Agent 代跑 scripts/taiyi-forge.sh（100% 斜杠面）
---

# taiyi-forge（引擎 Skill）

## 原则

- **用户只说 `/taiyi:*`**（Codex：`$taiyi-*`）；你代跑 `scripts/taiyi-forge.sh`，禁止让用户手打 shell。
- 写 CHANGE/DESIGN 等工件 → 加载 `taiyi-change` … `taiyi-integration`，不是本 Skill。

## 主流程

| 斜杠 | 含义 |
|------|------|
| `/taiyi:new 功能名` | 新建变更 |
| `/taiyi:status` | 阶段进度、Skill、工件 |
| `/taiyi:continue` | 过关当前阶段 |
| `/taiyi:apply` | dev/test 实现清单 |
| `/taiyi:archive` | 归档 |

## 常用辅助

`/taiyi:doctor` · `/taiyi:audit` · `/taiyi:verify` · `/taiyi:list` · `/taiyi:check` · `/taiyi:sync` · `/taiyi:handoff` · `/taiyi:cancel` · `/taiyi:loop` · `/taiyi:review-loop` · `/taiyi:review-check` · `/taiyi:token *` · `/taiyi:commit-trailers`

## 引擎斜杠（原 CLI-only）

`/taiyi:init` · `/taiyi:complete` · `/taiyi:mark-aux` · `/taiyi:assess` · `/taiyi:harness-check` · `/taiyi:phases` · `/taiyi:guide` · `/taiyi:state` · `/taiyi:state-read` · `/taiyi:next` · `/taiyi:done` · `/taiyi:ci platform` · `/taiyi:ci prompt`

## 交付链（gstack · 见 docs/taiyi/delivery-slash.md）

| 斜杠 | gstack Skill |
|------|--------------|
| `/taiyi:commit` | commit-trailers + git |
| `/taiyi:ship` | ship |
| `/taiyi:land` | land-and-deploy |
| `/taiyi:gstack review` | review |
| `/taiyi:gstack qa` | qa |
| `/taiyi:release` | document-release |

## 无 shell 子命令（仅 Skill）

`/taiyi:explore` · `/taiyi:flow` · `/taiyi:full-flow` · `/taiyi:tdd plan|dev`

完整列表：`docs/taiyi/commands.yaml` → `slash_catalog`

## Agent 代跑

```bash
scripts/taiyi-forge.sh <cmd> ...   # 映射自用户斜杠
```

示例：用户 `/taiyi:continue` → `taiyi-forge.sh continue [slug] [--approver 名]`
