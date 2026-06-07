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
| `/taiyi:apply` | **仅 dev / test**：打印实现 harness（不 complete；写完代码后 continue） |
| `/taiyi:archive` | 九阶段全部完成后归档 |

### 辅助命令（按需）

| 命令 | 何时用 |
|------|--------|
| `/taiyi:doctor` | 安装/升级后自检（≈ `omc doctor`）+ **工作区流程** |
| `/taiyi:handoff` | 暂停前写 HANDOFF.md（≈ OMC notepad / gstack checkpoint） |
| `/taiyi:cancel` | 取消进行中变更（aborted） |
| `/taiyi:list` | **多个变更并行**时列 slug（否则 continue 报错） |
| `/taiyi:check` | `--auto` 时每阶段看 harness 铁三角清单 |
| `/taiyi:loop` | 循环 `continue` 直到完成或阻塞（人工门需 `--approver`） |
| `/taiyi:verify` | PR/CI 工件门禁（`ci verify` 的斜杠入口） |
| `/taiyi:audit` | 流程/交付排查（git 未入库、CHANGE 漂移等） |
| `/taiyi:review-loop` | review 机器审查；不过则继续修再跑 |
| `/taiyi:review-check` | 单次 review **循环门禁**（无 open high；≠ `complete review` 的 Approve 勾选） |
| `/taiyi:token *` | Token 预算：status / record / scan / compress |
| `/taiyi:sync` | 同步到 OpenSpec（≈ `opsx:sync`） |
| `/taiyi:run` | 首次体验演示（≈ `omc.sh run`，非日常） |
| `/taiyi:explore` | change 阶段：Superpowers brainstorming（≈ clarify/explore） |
| `/taiyi:flow` | Superpowers 全技能 × 九阶段总览（onboarding 首选） |
| `/taiyi:tdd plan\|dev` | task/dev：Superpowers TDD（计划切片测试 / 红绿重构） |

### Git / PR / 部署（gstack · 见 [delivery-slash.md](./delivery-slash.md)）

| 斜杠 | 何时用 |
|------|--------|
| `/taiyi:commit` | 实现完成后，带 Taiyi-Change trailer 的 git commit |
| `/taiyi:ship` | 推分支、开 PR（gstack ship） |
| `/taiyi:land` | 合并 PR、部署、canary（gstack land-and-deploy） |
| `/taiyi:gstack review` | PR diff 结构审查（gstack review） |
| `/taiyi:gstack qa` | 站点 QA（test 阶段 optional） |
| `/taiyi:release` | 文档/CHANGELOG 发布同步（integration optional） |

写工件仍用 **taiyi-change … taiyi-integration** Skill，不走 `/taiyi:*`。

**new/init 只铺当前阶段模板**（默认仅 `CHANGE.md`）；`CONTEXT.md` 由 `taiyi-intel-scan` 产出，不会预置。过关后引擎才为下一阶段生成模板文件。

**状态同步（v0.22+）**：`status` / `continue` 会自动从磁盘同步 `auxiliaryCompleted`（如已有 `CONTEXT.md`）、去掉已填好内容的 `<!-- taiyi:seed-template -->`。若存在**超前阶段工件**（当前 change 但已有实质 `REQUIREMENT.md`），`continue` 会拦截并提示删除或按步推进。

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
⑤ task         → taiyi-task + TDD计划 → TASK.md          → /taiyi:tdd plan → continue
⑥ dev          → taiyi-dev + TDD     → 代码              → /taiyi:tdd dev · /taiyi:apply
⑦ test         → taiyi-test          → TEST.md          → /taiyi:apply 或 continue
⑧ review       → taiyi-review → REVIEW.md → /taiyi:health · /taiyi:gstack review · /taiyi:review-loop
                 → /taiyi:commit → /taiyi:ship → continue --approver
⑨ integration  → @taiyi-integration → /taiyi:land（可选）· /taiyi:release → /taiyi:continue
   ※ 交付门：须 commit + 干净工作区 + Taiyi-Change trailer（见 delivery-gate.md）

/taiyi:archive
```

`--auto` 时每阶段另有 harness 铁三角打卡 + **手动 mark-aux**（见 `taiyi-orchestrator`）。

## init 与 new（推荐路径）

| 命令 | 用途 | auto 默认 |
|------|------|-----------|
| **`taiyi new <标题>`** | **日常推荐** — 自动 slug | **关**（须 `--auto` 才全自动） |
| `taiyi init <slug>` | CI / 固定 slug / 脚本 | 关 |

二者都只 seed **CHANGE.md**，不会自动跑九阶段。

## walkthrough 两套（勿混）

| 命令 | 作用 |
|------|------|
| `npx taiyi walkthrough` / `/taiyi:run` | doctor + init demo + 下一步指引 |
| `examples/minimal-project` 的 `npm run walkthrough-e2e` | 真·九阶段 shell E2E（`walkthrough` 为别名） |

## Profile 说明

| Profile | 说明 |
|---------|------|
| `full` | 九阶段 |
| `ui` | 与 `full` 相同 |
| `api` | 跳过 ui-design |
| `lite` | change → requirement → dev → test → integration；**无 review / REVIEW.md** |

high 复杂度会推荐 `taiyi-evolve`，其 home 阶段为 **test**（`architecture-sync.md`）；**review 过关仅强制** `taiyi-health`。

## audit 超前工件

`audit` 会报告 `artifacts.ahead-of-phase`：当前阶段未到但未来阶段工件已存在（常见于旧版全量 seed 或手误），易误判进度。

## 100% 斜杠（v0.23+）

所有 `taiyi` CLI 子命令均有 `/taiyi:*` 别名，见 `commands.yaml` → `slash_catalog`。用户只说斜杠；Agent 代跑 `taiyi-forge.sh`。

| 原仅 CLI | 现斜杠 |
|----------|--------|
| `init` / `complete` / `mark-aux` / `assess` / `harness-check` | 同名斜杠 |
| `phases` / `guide` / `next` / `done` | 同名斜杠 |
| `commit-trailers` | `/taiyi:commit-trailers` |
| MCP 读状态 | `/taiyi:state` · `/taiyi:state-read` |
| `ci platform` / `ci prompt` | `/taiyi:ci platform` · `/taiyi:ci prompt` |

写工件仍用 **taiyi-change … taiyi-integration** Skill（@Skill，不是斜杠）。

## 和 OpenSpec 对照

| OpenSpec | TaiyiForge |
|----------|------------|
| `/opsx:new` | `/taiyi:new` |
| `/opsx:continue` | `/taiyi:continue`（× 多次，每阶段一次） |
| `/opsx:apply` | `/taiyi:apply`（dev/test） |
| `/opsx:archive` | `/taiyi:archive` |
| （无直接对应） | `/taiyi:status`（阶段可见性） |
