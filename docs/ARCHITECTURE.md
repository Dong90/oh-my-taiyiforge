# TaiyiForge 架构

> 将六大工程标准转化为 AI 可执行工作流（开源 · Claude / Codex / Cursor 四端）

## 产品名

- **仓库**：`oh-my-taiyiforge`
- **引擎/品牌**：**TaiyiForge**
- **Skill 前缀**：`taiyi-*`（不用 `flow-*`）
- **运行时目录**：`.taiyi/changes/<slug>/`

## 六大工程标准

| 标准 | 作用 | 必选？ |
|------|------|--------|
| Harness Engineering | 不达标不进、无产出不出 | 是（`--auto` 铁三角 + complete） |
| OpenSpec | 规格驱动，先文档后实现 | **可选层**（未装自动跳过） |
| GStack | 架构决策 Options + Reason + Cost | 分阶段铁三角（部分 optional） |
| Superpowers | 有界 Skill、可验证输出 | change/dev/test 铁三角 |
| OMO | AI 执行，关键节点人审批 | 是（human-gate） |
| Spec-Kit | 模板与检查清单可执行 | 是（templates + quality-gate） |

`.taiyi/changes/<slug>/` 为**真源**；OpenSpec 为可选镜像/归档，与 Spec-Kit **不冲突**。

## 架构总览

> 可编辑真源：[taiyiforge-architecture.svg](./taiyiforge-architecture.svg)（v0.22 · Flow-X 布局）· 重生成：`python3 scripts/generate-architecture-svg.py`  
> **C4 真源**：[c4/README.md](./c4/README.md) · [c4/containers.md](./c4/containers.md) · **工程补充**：[diagrams/architecture.md](./diagrams/architecture.md) · **流程图**：[diagrams/flows.md](./diagrams/flows.md) · **C4 预览 SVG**：[c4/png/](./c4/png/) · 流水线：[diagrams/pipeline.md](./diagrams/pipeline.md) · `/taiyi:diagram-pipeline --repo`

## 核心引擎能力（对齐架构图）

| 能力 | 实现 |
|------|------|
| 统一入口 | `taiyi` CLI · `taiyi-forge.sh` · 消费方 `scripts/taiyi-forge.sh`（install 写入）· OpenCode `taiyi_*` · `/taiyi:*` |
| **意图分析** | `inferComplexitySignals` + `assessComplexity`；`/taiyi:status` 输出「意图分析: …」 |
| **Token 预算** | `.token-usage.json` · 阶段上限 · 引擎 + **Superpowers/gstack 压缩** · 见 [token-budget.md](./taiyi/token-budget.md) · [token-compress.md](./taiyi/token-compress.md) |
| 前置校验 | artifact 检测 · auto harness blockers · token enforce（可选） |
| 路由决策 | profile full/api/lite · auxiliary-hints · phase-registry |
| 复杂度评估 | `assess` · `state.complexity` |
| Harness 编排 | `harness-runner` · `taiyi-orchestrator` |
| 状态追踪 | `state.json` · status/list/guide |
| **流程排查** | `workflow-audit` → `/taiyi:audit`（漂移、legacy state、交付未闭环） |
| **CI 工件门禁** | `ci-verify` → `/taiyi:verify`（= `ci verify`，无 LLM） |
| **健康基线** | `health-invoke` → `/taiyi:health`（对齐 taiyi-health Skill） |
| **交付门** | `delivery-gate` · integration complete 前 `auditChange({ pretendIntegrationComplete })` |
| **归档串联** | `taiyiArchive` 前 auto `sync-openspec` · integration 后 `syncRootChangelog` |

## 九阶段（taiyi-* Skill）

| # | 阶段 | Skill | 产出 |
|---|------|-------|------|
| 1 | change | taiyi-change | CHANGE.md |
| 2 | requirement | taiyi-requirement | REQUIREMENT.md |
| 3 | design | taiyi-design | DESIGN.md |
| 4 | ui-design | taiyi-ui-design | UI-DESIGN.md |
| 5 | task | taiyi-task | TASK.md |
| 6 | dev | taiyi-dev | 代码 + 测试（TDD） |
| 7 | test | taiyi-test | TEST.md |
| 8 | review | taiyi-review | REVIEW.md |
| 9 | integration | taiyi-integration | CHANGELOG.md |

辅助工件：`CONTEXT.md`（`templates/CONTEXT.md` + intel-scan）· `adr/` · `health-report.md` · `ui-restyle-tasks.md` · `architecture-sync.md`

## 三门禁

1. **Human Approval** — `gates/human-gate.ts`（默认 change / design / review）
2. **Quality Gate（五维）** — `gates/quality-gate.ts`
3. **Delivery Gate（0.22）** — `gates/delivery-gate.ts`（git 仓库 integration 前：有新 commit 且工作区干净；配合 integration 前 audit）

铁三角 optional 钩子（ui-design plan-design-review、gstack/qa、OpenSpec）在 `--auto` 下**不阻塞** complete。

## 知识沉淀（架构图 footer）

沉淀载体为：

- `adr/`、`CONTEXT.md` — 决策与代码库情报
- 变更 `CHANGELOG.md` + **根 `CHANGELOG.md` 合并**（integration complete）
- `sync-openspec` + **archive 前自动 sync** — 可选进主规格库
- `health-report.md`、`architecture-sync.md` — 质量与演进记录

## 四端支持

见 `docs/taiyi/agents.yaml` 与 `docs/taiyi/control-plane.md`。

Agent 写工件；**状态机与门禁**由引擎校验。

## 代码布局

```
src/core/           # 引擎（含 infer-complexity、template-seed）
docs/taiyi/         # phases、harness-hooks、commands、workflow
skills/taiyi-*/     # 23 个 Skill（主流程 9 + 辅助 11 + 编排 3）
docs/c4/            # C4 架构真源（diagram-c4 / pipeline）
docs/diagrams/      # 工程架构 Mermaid + 流程图
templates/          # 九阶段 + CONTEXT.md
.taiyi/             # 运行时（gitignore）
```
