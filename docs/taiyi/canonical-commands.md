# TaiyiForge 推荐斜杠（去重后）

真源：`docs/taiyi/commands.yaml` → `canonical_commands` · `slash_catalog` · `legacy_cli`

**generated 表格**：`npm run generate:docs` → `prompts/inc/slash-catalog.generated.md` + 本节标记块（`docs/taiyi/inc/canonical-tables.generated.md`）

**原则**：每条职责一个聊天入口；重复别名已移除。引擎 CLI legacy 子命令仍可用于脚本/CI。

<!-- BEGIN GENERATED canonical-tables -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 日常主链

| 意图 | 推荐斜杠 | 说明 |
|------|----------|------|
| 新建变更 | `/taiyi:new <标题>` | 创建变更目录、**默认手动**九阶段、仅铺 CHANGE.md 模板（对标 opsx:new） |
| 看进度 | `/taiyi:status` | Agent 默认 `status --json --compact`；人类可读用无前缀 status |
| 写当前阶段工件 | `/taiyi:write` | 引擎输出应加载的 `@taiyi-*` Skill |
| 过关 | `/taiyi:continue` | 尝试 complete 当前阶段；失败则输出 next 指引（对标 opsx:continue） |
| dev/test 实现清单 | `/taiyi:apply` | 仅 dev/test：打印实现 harness 清单（对标 opsx:apply） |
| 归档 | `/taiyi:archive` | integration 阶段完成后归档（对标 opsx:archive） |

## 会话与排查

| 意图 | 推荐斜杠 |
|------|----------|
| 暂停 | `/taiyi:handoff` |
| 恢复 | `/taiyi:resume` |
| 放弃变更 | `/taiyi:cancel` |
| 多变更列表 | `/taiyi:list` |
| 仅归档列表 | CLI：`list --archived`；全量：`list --all [--archived]` |
| 清理 aborted | `prune --aborted` |
| 安装自检 | `/taiyi:doctor`（Agent `doctor --json --compact`） |
| 流程/交付排查 | `/taiyi:audit`（Agent `audit --json --compact`） |
| PR/CI 工件门禁 | `/taiyi:verify` |

## 场景捷径

| 斜杠 | 用途 |
|------|------|
| `/taiyi:feature` | 新功能 full 九阶段剧本 |
| `/taiyi:bug` | lite 五阶段修 bug |
| `/taiyi:ui-test` | test 阶段 UI QA（gstack qa + e2e） |

<!-- END GENERATED canonical-tables -->

<!-- BEGIN GENERATED diagram-pipeline -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 架构图流水线

| 斜杠 | 步骤 | 说明 |
|------|------|------|
| `/taiyi:diagram-pipeline` | ①②③ | 架构图三步流水线编排：① diagram-c4（C4 真源）→ ② diagram-arch（工程补充）→ ③ diagram-render（SVG） |
| `/taiyi:diagram-c4` | ① | 流水线第 1 步：扫代码写 C4 真源（Observed/Inferred + Mermaid） |
| `/taiyi:diagram-arch` | ② | 流水线第 2 步：以 `diagrams/c4/containers.md` 为真源同步 `diagrams/architecture.md`（勿重划模块） |
| `/taiyi:diagram-render` | ③ | 流水线第 3 步：Mermaid → SVG（`render-mermaid.mjs` 或 diagramming-architecture 视觉审查） |
| `/taiyi:diagram-flow` | — | 业务流程图 / 状态机 / 九阶段 flowchart；AC 追溯表；TASK 切片对齐 |

详见 `docs/diagrams/pipeline.md` · `commands.yaml` → `auxiliary.commands`。

<!-- END GENERATED diagram-pipeline -->

<!-- BEGIN GENERATED delivery-chain -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 交付链（gstack）

```text
/taiyi:commit → /taiyi:verify → /taiyi:gstack review（可选）
→ /taiyi:ship → /taiyi:land → /taiyi:release（可选）
→ /taiyi:continue integration → /taiyi:archive
```

详见 [delivery-slash.md](./delivery-slash.md)。

<!-- END GENERATED delivery-chain -->

<!-- BEGIN GENERATED browser-e2e -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 浏览器 / E2E

Token 纪律：全量 `playwright test` / probe 在 **CI 或后台**跑；聊天只写 TEST.md 摘要，勿灌日志。

| 斜杠 | 引擎 | 说明 |
|------|------|------|
| `/taiyi:browser-smoke` | `browser-smoke` | 内置 Playwright 浏览器冒烟（examples/browser-e2e-smoke） |
| `/taiyi:e2e` | （聊天） | 目标项目 `npx playwright test`（Agent 代跑；摘要写 TEST.md） |
| `/taiyi:gstack qa` | （聊天） | gstack browse 走查 |
| `/taiyi:ui-test` | （聊天） | test 阶段 UI QA 捷径 |

<!-- END GENERATED browser-e2e -->

## 自主编排（OMC 原生迁移 · 多 Agent）

对标 oh-my-codex 自主模式；**未去重、仍保留**。每个斜杠均有 `prompts/taiyi-*.md`。详见 [autonomous.md](./autonomous.md) · [omc-reference.md](./omc-reference.md)。

| 斜杠 | 引擎 | 作用 | prompt |
|------|------|------|--------|
| `/taiyi:ralph [slug]` | `ralph` | 验证不过修到绿（ralplan-first） | `taiyi-ralph.md` |
| `/taiyi:autopilot [slug]` | `autopilot` | 九阶段全自动（须 `--auto`） | `taiyi-autopilot.md` |
| `/taiyi:daemon run <slug>` | `daemon run` | 无人闭环（引擎 + 外部 Agent CLI） | `taiyi-daemon.md` |
| `/taiyi:team [slug]` | `team` | plan → exec → verify → fix 泳道 | `taiyi-team.md` |
| `/taiyi:ultrawork [slug]` | `ultrawork` | TASK 切片并行 / spawn 计划 | `taiyi-ultrawork.md` |
| `/taiyi:agent <role\|list>` | `agent` | 29 专 Agent（`agent-roles.yaml`） | `taiyi-agent.md` |
| `/taiyi:step [slug]` | `step` | 单步驱动（ralph/autopilot/… 一轮） | `taiyi-step.md` |
| `/taiyi:stop-mode` | `stop-mode` | 停止活跃模式（≈ `stopomc`） | `taiyi-stop-mode.md` |
| `/taiyi:modes` | `modes` | 列出 `.taiyi/runtime/*-mode.json` | `taiyi-modes.md` |
| `/taiyi:keyword <text>` | `keyword` | 口头关键词 → 斜杠映射 | `taiyi-keyword.md` |
| `/taiyi:preflight` | preflight 脚本 | Codex 无 hook 时的 keyword+step 纪律 | `taiyi-preflight.md` |

Workflow 扩展（均有 prompt）：`/taiyi:plan` · `/taiyi:ralplan` · `/taiyi:ultraqa` · `/taiyi:ccg` · `/taiyi:sciomc` · `/taiyi:deepinit` · `/taiyi:external-context` · `/taiyi:remember`

典型串联：`ralplan` → `team` → `ultrawork` → `ralph` → `review-loop` → `continue` → `stop-mode`

### 与 OMC 的差异（非 1:1）

| OMC 能力 | TaiyiForge |
|----------|------------|
| Claude SDK `spawn_agent` | 输出 **spawn 计划** + Cursor Task 协议；宿主派发 subagent |
| tmux team workers | **无 tmux MCP**；`team` 为状态机 + 泳道协议 |
| keyword hook | Cursor/Claude **hook 自动**；Codex 用 `/taiyi:preflight` 或 `/taiyi:keyword` |
| HUD / trace | `/taiyi:modes` + `engineTruth` |
| 依赖 OMC 安装 | **不依赖**；原生 `scripts/taiyi-forge.sh` |

## 外挂 Skill 路由

| 斜杠 | 用途 |
|------|------|
| `/taiyi:gstack <skill>` | 任意 gstack |
| `/taiyi:sp <skill>` | 任意 Superpowers |
| `/taiyi:explore` | change 阶段头脑风暴 |
| `/taiyi:tdd plan\|dev` | TDD 纪律入口 |
| `/taiyi:flow` / `/taiyi:full-flow` | 流程总览 |

## 已合并的重复项（勿再新增斜杠）

| 曾用 | 现用 |
|------|------|
| `/taiyi:pause` | `/taiyi:handoff` |
| `/taiyi:commit-trailers` | `/taiyi:commit` |
| `/taiyi:state` · `/taiyi:state-read` | `/taiyi:status` 或 `status --json` / MCP |
| `/taiyi:next` · `/taiyi:done` | `/taiyi:status` + `/taiyi:continue` |
| `/taiyi:guide` | `/taiyi:status` 或 `taiyi guide --json`（脚本） |
| `/taiyi:change` … `/taiyi:integration` | `/taiyi:write` |
| `/taiyi:gstack release` | `/taiyi:release` |

## Legacy CLI（无聊天斜杠）

`pause` · `commit-trailers` · `next` · `done` · `guide` · `change` · `requirement` · … — 见 `commands.yaml` → `legacy_cli`。

九阶段 Skill（`@taiyi-change` … `@taiyi-integration`）仍可直接加载；聊天写工件统一走 **`/taiyi:write`**。
