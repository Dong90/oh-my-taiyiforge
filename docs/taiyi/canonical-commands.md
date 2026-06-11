# TaiyiForge 推荐斜杠（canonical v28）

真源：`docs/taiyi/commands.yaml` → **`canonical_v28`** · `slash_catalog.recommended_v28` · `legacy_slash`

**generated 表格**：`npm run generate:docs` → `prompts/inc/slash-catalog.generated.md` + 本节标记块（`docs/taiyi/inc/*.generated.md`）

**原则**：聊天推荐 **28 条顶栏**；引擎能力与旧 prompt **不删**，见 [Legacy 兼容](#legacy-兼容)。融合分层见 [skill-fusion-principles.md](./skill-fusion-principles.md)。

### Phase 1 说明（当前）

v28 是 **推荐命名 + help/catalog 收敛**，不是运行时菜单裁剪：

| 层 | 现状 |
|----|------|
| **文档 / help** | `/taiyi:help`、`canonical-commands.md` 只推荐 28 条顶栏 |
| **Cursor `/` 菜单** | `install --cursor` 同步 **全部** `prompts/taiyi-*.md` → `~/.cursor/commands/` |
| **Claude `/` 菜单** | `install --claude` 同步同源 → `~/.claude/commands/` |
| **Codex `$taiyi-*`** | `install --codex` 同步同源 → `~/.codex/prompts/` |
| **OpenCode `/` 菜单** | `install --opencode` 同步同源 → `~/.config/opencode/commands/` |
| **伞形斜杠** | 如 `/taiyi:test smoke` **尚无**独立 `taiyi-test.md`；Agent 按本节 [伞形地图](#伞形命令--子命令地图) 加载 legacy prompt |
| **引擎 CLI** | 子命令分发（token/test/workflow 等）仍走既有 `taiyi-forge.sh` 与 legacy 斜杠 |

`canonical_v28` 与 `slash_catalog.recommended_v28` 须保持一致；`npm run generate:docs` 与测试会校验。Phase 2（可选）：伞形 prompt 或 install 过滤，真正缩短 IDE 菜单。

## v28 一览（28 条）

| # | 分组 | 斜杠 |
|---|------|------|
| 1–6 | 主链 | `new` · `status` · `write` · `continue` · `apply` · `archive` |
| 7–10 | 会话 | `handoff` · `resume` · `cancel` · `list` |
| 11–13 | 排查 | `doctor` · `audit` · `verify` |
| 14–17 | 交付 | `commit` · `ship` · `land` · `release` |
| 18–19 | 路由 | `gstack <skill>` · `sp <skill>` |
| 20–22 | 阶段捷径 | `explore` · `tdd plan\|dev` · `flow` |
| 23–28 | 伞形 | `token …` · `test …` · `review …` · `diagram …` · `mode …` · `workflow …` |

日常最短路径：

```text
new → write → continue → apply → continue → … → commit → continue integration → archive
```

<!-- BEGIN GENERATED canonical-tables -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## v28 主链（6）

| 意图 | 推荐斜杠 | 说明 |
|------|----------|------|
| 新建变更 | `/taiyi:new <标题>` | 创建变更目录、**默认手动**九阶段、仅铺 CHANGE.md 模板（对标 opsx:new） |
| 看进度 | `/taiyi:status` | Agent 默认 `status --json --compact`；人类可读用无前缀 status |
| 写当前阶段工件 | `/taiyi:write` | 引擎输出应加载的 `@taiyi-*` Skill |
| 过关 | `/taiyi:continue` | 尝试 complete 当前阶段；失败则输出 next 指引（对标 opsx:continue） |
| dev/test 实现清单 | `/taiyi:apply` | 仅 dev/test：打印实现 harness 清单（对标 opsx:apply） |
| 归档 | `/taiyi:archive` | integration 阶段完成后归档（对标 opsx:archive） |

## v28 会话（4）

| 意图 | 推荐斜杠 |
|------|----------|
| 暂停 | `/taiyi:handoff` |
| 恢复 | `/taiyi:resume` |
| 放弃变更 | `/taiyi:cancel` |
| 多变更列表 | `/taiyi:list` |

## v28 排查（3）

| 意图 | 推荐斜杠 |
|------|----------|
| 安装自检 | `/taiyi:doctor`（Agent `doctor --json --compact`） |
| 流程/交付排查 | `/taiyi:audit`（Agent `audit --json --compact`） |
| PR/CI 工件门禁 | `/taiyi:verify` |

## v28 交付（4）

| 意图 | 推荐斜杠 |
|------|----------|
| 带 trailer 提交 | `/taiyi:commit` |
| 创建 PR | `/taiyi:ship` |
| 合并部署 | `/taiyi:land` |
| 文档/CHANGELOG | `/taiyi:release` |

## v28 路由与捷径

| 分组 | 斜杠 |
|------|------|
| 外挂 | `/taiyi:gstack <skill>` · `/taiyi:sp <skill>` |
| 阶段 | `/taiyi:explore` · `/taiyi:tdd plan|dev` · `/taiyi:flow` |

## v28 伞形命令（6）

| 域 | 斜杠 |
|----|------|
| Token | `/taiyi:token status|record|scan|compress` |
| 测试 | `/taiyi:test smoke|e2e|qa|ui|security` |
| Review | `/taiyi:review loop|check|health|gstack` |
| 架构图 | `/taiyi:diagram pipeline|c4|arch|render|flow` |
| 多 Agent / OMC | `/taiyi:mode ralph|autopilot|…` |
| 工作流扩展 | `/taiyi:workflow plan|loop|sync|…` |

## 场景（legacy → flow）

| 旧斜杠 | v28 入口 |
|--------|----------|
| `/taiyi:feature` | 新功能 full 九阶段（`/taiyi:flow feature`） |
| `/taiyi:bug` | lite 修 bug（`/taiyi:flow bug`） |
| `/taiyi:ui-test` | test UI QA（`/taiyi:test ui`） |

列表/清理：`list --archived` · `list --all` · `prune --aborted`（CLI，无独立顶栏）。

<!-- END GENERATED canonical-tables -->

<!-- BEGIN GENERATED diagram-pipeline -->

<!-- AUTO-GENERATED from docs/taiyi/commands.yaml — do not edit; run npm run generate:docs -->

## 架构图（v28 · `/taiyi:diagram`）

| v28 子命令 | 步骤 | 说明 | legacy 斜杠 |
|------------|------|------|-------------|
| `/taiyi:diagram pipeline` | ①②③ | 架构图三步流水线编排：① diagram-c4（C4 真源）→ ② diagram-arch（工程补充）→ ③ diagram-render（SVG） | `/taiyi:diagram-pipeline` |
| `/taiyi:diagram c4` | ① | 流水线第 1 步：扫代码写 C4 真源（Observed/Inferred + Mermaid） | `/taiyi:diagram-c4` |
| `/taiyi:diagram arch` | ② | 流水线第 2 步：以 `diagrams/c4/containers.md` 为真源同步 `diagrams/architecture.md`（勿重划模块） | `/taiyi:diagram-arch` |
| `/taiyi:diagram render` | ③ | 流水线第 3 步：Mermaid → SVG（`render-mermaid.mjs` 或 diagramming-architecture 视觉审查） | `/taiyi:diagram-render` |
| `/taiyi:diagram flow` | — | 业务流程图 / 状态机 / 九阶段 flowchart；AC 追溯表；TASK 切片对齐 | `/taiyi:diagram-flow` |

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
| `/taiyi:test smoke` | `browser-smoke` | 内置 Playwright 冒烟（v28 伞形 `test smoke`） |
| `/taiyi:test e2e` | （聊天） | 目标项目 `npx playwright test`（v28 伞形 `test e2e`） |
| `/taiyi:test qa` | （聊天） | gstack browse 走查（v28 伞形 `test qa`） |
| `/taiyi:test ui` | （聊天） | test 阶段 UI QA（v28 伞形 `test ui`） |

<!-- END GENERATED browser-e2e -->

## 伞形命令 · 子命令地图

Agent 收到 v28 伞形斜杠时，**优先**加载对应 legacy prompt / 引擎子命令（`commands.yaml` → `canonical_v28.groups.umbrellas`）。

### `/taiyi:test`

| 子命令 | legacy | 说明 |
|--------|--------|------|
| `smoke` | `/taiyi:browser-smoke` | 内置 Playwright 冒烟 |
| `e2e` | `/taiyi:e2e` | 目标项目 playwright |
| `qa` | `/taiyi:gstack qa` | gstack browse |
| `ui` | `/taiyi:ui-test` | test 阶段 UI 捷径 |
| `security` | `/taiyi:security` | semgrep + trivy |

### `/taiyi:review`

| 子命令 | legacy |
|--------|--------|
| `loop` | `/taiyi:review-loop` |
| `check` | `/taiyi:review-check` |
| `health` | `/taiyi:health` |
| `gstack` | `/taiyi:gstack review` |

### `/taiyi:diagram`

| 子命令 | legacy |
|--------|--------|
| `pipeline` | `/taiyi:diagram-pipeline` |
| `c4` | `/taiyi:diagram-c4` |
| `arch` | `/taiyi:diagram-arch` |
| `render` | `/taiyi:diagram-render` |
| `flow` | `/taiyi:diagram-flow` |

### `/taiyi:mode`（OMC / 多 Agent）

| 子命令 | legacy |
|--------|--------|
| `ralph` | `/taiyi:ralph` |
| `autopilot` | `/taiyi:autopilot` |
| `daemon` | `/taiyi:daemon` |
| `team` | `/taiyi:team` |
| `ultrawork` | `/taiyi:ultrawork` |
| `agent` | `/taiyi:agent` |
| `step` | `/taiyi:step` |
| `stop` | `/taiyi:stop-mode` |
| `list` | `/taiyi:modes` |
| `keyword` | `/taiyi:keyword` |
| `preflight` | `/taiyi:preflight` |

详见 [autonomous.md](./autonomous.md) · [omc-reference.md](./omc-reference.md)。

### `/taiyi:workflow`

| 子命令 | legacy |
|--------|--------|
| `plan` | `/taiyi:plan` |
| `ralplan` | `/taiyi:ralplan` |
| `loop` | `/taiyi:loop` |
| `check` | `/taiyi:check` |
| `run` | `/taiyi:run` |
| `sync` | `/taiyi:sync` |
| `ccg` | `/taiyi:ccg` |
| `sciomc` | `/taiyi:sciomc` |
| `deepinit` | `/taiyi:deepinit` |
| `remember` | `/taiyi:remember` |
| `ultraqa` | `/taiyi:ultraqa` |
| … | `external-context` · `deep-interview` · `visual-verdict` · `ai-slop-cleaner` · `ecomode` |

### `/taiyi:flow`

| 子命令 | 说明 |
|--------|------|
| `full-flow` | 全工具链（旧 `/taiyi:full-flow`） |
| `feature` | 新功能剧本（旧 `/taiyi:feature`） |
| `bug` | lite 修 bug（旧 `/taiyi:bug`） |
| `help` | 全量目录（旧 `/taiyi:help`） |

## 与 OMC 的差异（非 1:1）

| OMC 能力 | TaiyiForge |
|----------|------------|
| Claude SDK `spawn_agent` | 输出 **spawn 计划** + Cursor Task 协议 |
| tmux team workers | **无 tmux MCP**；`team` 为状态机 + 泳道协议 |
| keyword hook | Cursor/Claude hook；Codex 用 `/taiyi:mode preflight` 或 `keyword` |
| HUD / trace | `/taiyi:mode list` + `engineTruth` |
| 依赖 OMC 安装 | **不依赖**；原生 `scripts/taiyi-forge.sh` |

## Legacy 兼容

旧斜杠与 prompt **仍可用**；`slash_catalog.legacy_slash` 列出完整清单。**勿再新增**与 v28 伞形重复的顶栏。

| 曾用 | v28 现用 |
|------|----------|
| `/taiyi:pause` | `/taiyi:handoff` |
| `/taiyi:commit-trailers` | `/taiyi:commit` |
| `/taiyi:state` · `/taiyi:state-read` | `/taiyi:status` / MCP |
| `/taiyi:next` · `/taiyi:done` | `/taiyi:status` + `/taiyi:continue` |
| `/taiyi:guide` | `/taiyi:status` 或 `guide --json` |
| `/taiyi:change` … `/taiyi:integration` | `/taiyi:write` |
| `/taiyi:gstack release` | `/taiyi:release` |
| `/taiyi:browser-smoke` 等 | `/taiyi:test smoke` 等 |
| `/taiyi:ralph` 等 OMC | `/taiyi:mode ralph` 等 |

## Legacy CLI（无聊天斜杠）

`pause` · `commit-trailers` · `next` · `done` · `guide` · `change` · `requirement` · … — 见 `commands.yaml` → `legacy_cli`。

九阶段 Skill（`@taiyi-change` … `@taiyi-integration`）仍可直接加载；聊天写工件统一走 **`/taiyi:write`**。
