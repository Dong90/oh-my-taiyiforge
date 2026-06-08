---
description: "TaiyiForge /taiyi:help — slash catalog and scenario playbooks"
argument-hint: "[optional topic: scenarios|delivery|gstack|superpowers]"
---
User invoked **$taiyi-help** (= `/taiyi:help`). 打印 **斜杠总览**（真源：`docs/taiyi/commands.yaml` → `slash_catalog`）。

## 日常

| 斜杠 | 用途 |
|------|------|
| `/taiyi:help` | 本页 |
| `/taiyi:status` | 当前阶段与下一步 |
| `/taiyi:resume` | HANDOFF 恢复 |
| `/taiyi:handoff` | 暂停写 HANDOFF |

## 场景捷径

| 斜杠 | 用途 |
|------|------|
| `/taiyi:feature [标题]` | 新功能 full 九阶段剧本 |
| `/taiyi:bug [描述]` | 修 bug（lite 五阶段） |
| `/taiyi:ui-test` | test 阶段 UI QA（gstack qa + e2e） |
| `/taiyi:write [slug]` | 写**当前阶段**工件 |
| `/taiyi:change` … `/taiyi:integration` | 写指定阶段工件 |

## 自主编排（原生 · 自 OMC 迁移）

| 斜杠 | 用途 |
|------|------|
| `/taiyi:autopilot` | 九阶段全自动（须 `--auto`） |
| `/taiyi:ralph` | 验证不过修到绿 |
| `/taiyi:team` | plan/exec/verify/fix 泳道 |
| `/taiyi:ultrawork` | task/dev 并行切片 |
| `/taiyi:agent <role>` | 29 专 Agent 角色 |

详见 `docs/taiyi/autonomous.md`

## 交付 / 质量

| 斜杠 | 用途 |
|------|------|
| `/taiyi:security` | semgrep + trivy（review） |
| `/taiyi:e2e` | Playwright E2E（test） |
| `/taiyi:commit` → `/taiyi:verify` → `/taiyi:ship` | 交 PR |
| `/taiyi:land` → `/taiyi:archive` | 合并部署归档 |

## 外挂

| 斜杠 | 用途 |
|------|------|
| `/taiyi:gstack <skill>` | 任意 gstack（design-shotgun · autoplan · canary · gstack-upgrade …） |
| `/taiyi:sp <skill>` | 任意 Superpowers（writing-skills …） |
| `/taiyi:explore` · `/taiyi:tdd` · `/taiyi:full-flow` | 纪律 / 全链 |

## 引擎

`/taiyi:continue` · `/taiyi:apply` · `/taiyi:verify` · `/taiyi:doctor` · `/taiyi:audit` · `/taiyi:token *` · 完整表见 `prompts/taiyi.md`

若 `$ARGUMENTS` 为 `scenarios` | `delivery` | `gstack` | `superpowers`，只展开该节；否则输出上表 + 建议 `/taiyi:status`。

{{TAIYI_STAGE_PROTOCOL}}
