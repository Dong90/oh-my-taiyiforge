---
name: taiyi-forge
description: TaiyiForge 引擎控制面 — 用户只说 /taiyi:* 斜杠，Agent 代跑 scripts/taiyi-forge.sh
---

# taiyi-forge（引擎 Skill）

## 原则

- **用户只说 `/taiyi:*`**（Codex：`$taiyi-*`）；你代跑 `scripts/taiyi-forge.sh`，禁止让用户手打 shell。
- 写工件 → **`/taiyi:write`**，再加载引擎输出的 `taiyi-change` … `taiyi-integration` Skill。

## 主流程

| 斜杠 | 含义 |
|------|------|
| `/taiyi:new 功能名` | 新建变更 |
| `/taiyi:status` | 阶段进度、Skill、工件 |
| `/taiyi:write` | 写当前阶段工件 |
| `/taiyi:continue` | 过关当前阶段 |
| `/taiyi:apply` | dev/test 实现清单 |
| `/taiyi:archive` | 归档 |

## 常用辅助

`/taiyi:doctor` · `/taiyi:audit` · `/taiyi:verify` · `/taiyi:list` · `/taiyi:check` · `/taiyi:sync` · `/taiyi:handoff` · `/taiyi:cancel` · `/taiyi:loop` · `/taiyi:write` · `/taiyi:review-loop` · `/taiyi:review-check` · `/taiyi:token *`

## 引擎斜杠（脚本/CI）

`/taiyi:init` · `/taiyi:complete` · `/taiyi:mark-aux` · `/taiyi:assess` · `/taiyi:harness-check` · `/taiyi:phases` · `/taiyi:ci platform` · `/taiyi:ci prompt`

Legacy CLI（无聊天斜杠）：`pause`→handoff · `commit-trailers`→用 `/taiyi:commit` · `next`/`done`→`/taiyi:continue` · `change`…→`/taiyi:write`

## 自主编排（OMC · 均有斜杠）

`/taiyi:ralph` · `/taiyi:autopilot` · `/taiyi:daemon` · `/taiyi:team` · `/taiyi:ultrawork` · `/taiyi:agent` · `/taiyi:step` · `/taiyi:stop-mode` · `/taiyi:modes` · `/taiyi:keyword` · `/taiyi:preflight`

与 OMC 差异：无 tmux team / 无 spawn_agent SDK — 见 `docs/taiyi/canonical-commands.md`

## 交付链（gstack · 见 docs/taiyi/delivery-slash.md）

| 斜杠 | gstack Skill |
|------|--------------|
| `/taiyi:commit` | commit-trailers + git |
| `/taiyi:ship` | ship |
| `/taiyi:land` | land-and-deploy |
| `/taiyi:gstack review` | review |
| `/taiyi:gstack qa` | qa |
| `/taiyi:gstack <skill>` | design-shotgun · autoplan · canary · gstack-upgrade … |
| `/taiyi:release` | document-release |

## 扩展斜杠

| 斜杠 | 用途 |
|------|------|
| `/taiyi:sp <skill>` | Superpowers（writing-skills …） |
| `/taiyi:security` | semgrep + trivy |
| `/taiyi:e2e` | Playwright E2E |
| `/taiyi:resume` | HANDOFF + status |
| `/taiyi:help` | 斜杠总览 |

## 无 shell 子命令（仅 Skill）

`/taiyi:explore` · `/taiyi:flow` · `/taiyi:full-flow` · `/taiyi:tdd plan|dev` · `/taiyi:gstack *` · `/taiyi:sp *`

完整列表：`docs/taiyi/canonical-commands.md` · `docs/taiyi/commands.yaml`

## Agent 代跑

```bash
scripts/taiyi-forge.sh <cmd> ...   # 映射自用户斜杠
```

示例：用户 `/taiyi:continue` → `taiyi-forge.sh continue [slug] [--approver 名]`
