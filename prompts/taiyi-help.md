---
description: "TaiyiForge /taiyi:help — slash catalog and scenario playbooks"
argument-hint: "[optional topic: scenarios|delivery|autonomous|gstack|superpowers|canonical]"
---
User invoked **$taiyi-help** (= `/taiyi:help`). 打印 **推荐斜杠**（真源：`docs/taiyi/canonical-commands.md` · `docs/taiyi/commands.yaml`）。

## 日常（五件套）

| 斜杠 | 用途 |
|------|------|
| `/taiyi:new <标题>` | 新建变更 |
| `/taiyi:status` | 当前阶段与下一步 |
| `/taiyi:write` | 写**当前阶段**工件 |
| `/taiyi:continue` | 过关当前阶段 |
| `/taiyi:archive` | 归档 |

## 会话

| 斜杠 | 用途 |
|------|------|
| `/taiyi:handoff` | 暂停写 HANDOFF |
| `/taiyi:resume` | HANDOFF 恢复 |
| `/taiyi:cancel` | 放弃变更 |

## 场景捷径

| 斜杠 | 用途 |
|------|------|
| `/taiyi:feature [标题]` | 新功能 full 九阶段剧本 |
| `/taiyi:bug [描述]` | 修 bug（lite 五阶段） |
| `/taiyi:ui-test` | test 阶段 UI QA |

## 自主编排（OMC 多 Agent · 均有斜杠 prompt）

| 斜杠 | 引擎 | 用途 |
|------|------|------|
| `/taiyi:ralph` | ralph | 验证不过修到绿 |
| `/taiyi:autopilot` | autopilot | 九阶段全自动（须 `--auto`） |
| `/taiyi:daemon run <slug>` | daemon | 无人闭环（引擎 + 外部 Agent CLI） |
| `/taiyi:team` | team | plan→exec→verify→fix 泳道 |
| `/taiyi:ultrawork` | ultrawork | TASK 切片并行 / spawn |
| `/taiyi:agent <role>` | agent | 29 专 Agent（见 agent-roles.yaml） |
| `/taiyi:step` | step | 单步驱动（配合 hook 循环） |
| `/taiyi:stop-mode` | stop-mode | 停止 ralph/autopilot/team 等 |
| `/taiyi:modes` | modes | 活跃运行时模式列表 |
| `/taiyi:keyword <text>` | keyword | 口头词 → 斜杠（ralph/team/ulw…） |
| `/taiyi:preflight` | — | Codex 无 hook 时 keyword+step 纪律 |

扩展：`/taiyi:plan` · `/taiyi:ralplan` · `/taiyi:ultraqa` · `/taiyi:ccg` · `/taiyi:sciomc` · `/taiyi:remember`

**与 OMC 差异**：无 tmux team / 无 spawn_agent SDK — 只出 spawn 计划 + 宿主 Task；keyword 靠 hook 或 `/taiyi:keyword`。详见 `docs/taiyi/autonomous.md`

## 架构图

| 斜杠 | 用途 |
|------|------|
| `/taiyi:diagram-pipeline` | C4 → arch → render 三步 |
| `/taiyi:diagram-c4` · `/taiyi:diagram-arch` · `/taiyi:diagram-render` | 单步 |
| `/taiyi:diagram-flow` | 业务流程 / AC 追溯 |

## 交付 / 质量

| 斜杠 | 用途 |
|------|------|
| `/taiyi:commit` → `/taiyi:verify` → `/taiyi:ship` | 提交 + 门禁 + 开 PR |
| `/taiyi:land` → `/taiyi:release` → `/taiyi:archive` | 合并部署 + 文档同步 |
| `/taiyi:security` · `/taiyi:e2e` · `/taiyi:browser-smoke` | review / test 质量 |
| `/taiyi:review-loop` | REVIEW.md 机器循环 |

## 外挂

| 斜杠 | 用途 |
|------|------|
| `/taiyi:gstack <skill>` | gstack（design-shotgun · autoplan · …） |
| `/taiyi:sp <skill>` | Superpowers |
| `/taiyi:explore` · `/taiyi:tdd` · `/taiyi:flow` | 纪律 / 总览 |

## 已合并（勿用旧斜杠）

`pause`→handoff · `commit-trailers`→commit · `state`→status · `next`/`done`→continue · 九阶段各斜杠→**write**

完整表：`docs/taiyi/canonical-commands.md` · 全量 catalog：`commands.yaml` → `slash_catalog`

若 `$ARGUMENTS` 为 `canonical` | `scenarios` | `delivery` | `autonomous` | `gstack` | `superpowers`，只展开该节；否则输出上表 + 建议 `/taiyi:status`。

{{TAIYI_STAGE_PROTOCOL}}
