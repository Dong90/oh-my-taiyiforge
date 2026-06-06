# TaiyiForge 工作流（四动词 + 九阶段）

## 两层结构

| 层 | 是什么 | 数量 |
|----|--------|------|
| **聊天动词** | `/taiyi:new` `continue` `apply` `archive` `status` | 5 条 |
| **九阶段** | 引擎状态机 + `taiyi-*` Skill 写工件 | 9 个 |

**四动词不是把九阶段合并成三步。** `continue` 在规划期要**每个阶段各用一次**。

单变更可省略 slug。**多变更时先 `/taiyi:list`**。

## 主流程 vs 辅助（对标 OMX）

| 类型 | TaiyiForge | OMX 对标 |
|------|------------|----------|
| **主流程** | new → status → continue → apply → archive | new → plan → apply → review → archive |
| **辅助** | doctor, list, check, sync, run | doctor, mode, run, clarify |

### 主流程（日常必用）

| 命令 | 何时用 |
|------|--------|
| `/taiyi:new 功能名` | 开始新变更 |
| `/taiyi:status` | 随时查看「当前第几阶段、该加载哪个 Skill」 |
| `/taiyi:continue` | 规划/收尾阶段：写完工件后推进 |
| `/taiyi:apply` | **仅 dev / test**：实现与验证 |
| `/taiyi:archive` | 九阶段全部完成后归档 |

### 辅助命令（按需）

| 命令 | 何时用 |
|------|--------|
| `/taiyi:doctor` | 安装/升级后自检（≈ `omx doctor`） |
| `/taiyi:list` | **多个变更并行**时列 slug（否则 continue 报错） |
| `/taiyi:check` | `--auto` 时每阶段看 harness 铁三角清单 |
| `/taiyi:loop` | 循环 `continue` 直到完成或阻塞（人工门需 `--approver`） |
| `/taiyi:verify` | PR/CI 工件门禁（`ci verify` 的斜杠入口） |
| `/taiyi:audit` | 流程/交付排查（git 未入库、CHANGE 漂移等） |
| `/taiyi:review-loop` | review 机器审查；不过则继续修再跑 |
| `/taiyi:review-check` | 单次机器审查 REVIEW.md |
| `/taiyi:token *` | Token 预算：status / record / scan / compress |
| `/taiyi:sync` | 同步到 OpenSpec（≈ `opsx:sync`） |
| `/taiyi:run` | 首次体验演示（≈ `omc.sh run`，非日常） |
| `/taiyi:explore` | change 阶段：Superpowers brainstorming（≈ clarify/explore） |

写工件仍用 **taiyi-change … taiyi-integration** Skill，不走 `/taiyi:*`。

## 可选层（架构图对齐）

| 组件 | 行为 |
|------|------|
| **OpenSpec** | requirement / integration 钩子 `optional: true`；未装 CLI 自动跳过 |
| **gstack/qa** | test 阶段 optional；CLI-only 可不打卡 |
| **gstack/plan-design-review** | ui-design 阶段 optional；纯 API 可跳过 |
| **/taiyi:explore** | 文档 + `$taiyi-explore` prompt → Superpowers brainstorming |

`/taiyi:status` 会显示 **意图分析**（模块/UI/测试层级推断）与铁三角清单（含「可选」标记）。

## 九阶段完整路径

```
/taiyi:new 用户登录

① change       → taiyi-change        → CHANGE.md        → /taiyi:continue
② requirement  → taiyi-requirement   → REQUIREMENT.md   → /taiyi:continue
③ design       → taiyi-design        → DESIGN.md        → /taiyi:continue
④ ui-design    → taiyi-ui-design     → UI-DESIGN.md     → /taiyi:continue
⑤ task         → taiyi-task          → TASK.md          → /taiyi:continue

⑥ dev          → taiyi-dev + TDD     → 代码              → /taiyi:apply
⑦ test         → taiyi-test          → TEST.md          → /taiyi:apply 或 continue
⑧ review       → taiyi-review        → REVIEW.md        → /taiyi:continue
⑨ integration  → taiyi-integration   → CHANGELOG.md     → /taiyi:continue
   ※ git 仓库默认启用**交付门**：须先 commit 实现代码且工作区干净（见 delivery-gate.md）

/taiyi:archive
```

`--auto` 时每阶段另有 harness 铁三角打卡（见 `taiyi-orchestrator`）。

## 和 OpenSpec 对照

| OpenSpec | TaiyiForge |
|----------|------------|
| `/opsx:new` | `/taiyi:new` |
| `/opsx:continue` | `/taiyi:continue`（× 多次，每阶段一次） |
| `/opsx:apply` | `/taiyi:apply`（dev/test） |
| `/opsx:archive` | `/taiyi:archive` |
| （无直接对应） | `/taiyi:status`（阶段可见性） |
