# TaiyiForge 架构

> 将六大工程标准转化为 AI 可执行工作流（开源 · Claude / Codex 双端）

## 产品名

- **仓库**：`oh-my-taiyiforge`
- **引擎/品牌**：**TaiyiForge**
- **Skill 前缀**：`taiyi-*`（不用 `flow-*`）
- **运行时目录**：`.taiyi/changes/<slug>/`

## 六大工程标准

| 标准 | 作用 |
|------|------|
| Harness Engineering | 不达标不进、无产出不出 |
| OpenSpec | 规格驱动，先文档后实现 |
| GStack | 架构决策 Options + Reason + Cost |
| Superpowers | 有界 Skill、可验证输出 |
| OMO | AI 执行，关键节点人审批 |
| Spec-Kit | 模板与检查清单可执行 |

## TaiyiForge CORE ENGINE

`src/core/workflow-engine.ts` — 统一入口、阶段依赖、双门禁、复杂度路由。

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

## 双门禁

1. **Human Approval** — `gates/human-gate.ts`
2. **Quality Gate（五维）** — `gates/quality-gate.ts`

## 双 Agent 支持

见 `docs/taiyi/agents.yaml`：

- **Claude Code** — `scripts/install-skills.sh claude`
- **Codex** — `scripts/install-skills.sh codex`
- **Cursor** — `scripts/install-skills.sh cursor` 或 `@oh-my-taiyiforge`

Agent 只负责按 Skill 写工件；**状态机与门禁**由 `taiyi` CLI / `WorkflowEngine` 校验，避免两端行为漂移。

## 代码布局

```
src/core/           # 引擎
docs/taiyi/         # phases、skills-catalog、agents、quality-gate
skills/taiyi-*/     # 15 个 Skill（开源分发）
templates/          # 工件模板
.taiyi/             # 运行时（gitignore）
AGENTS.md           # Claude/Codex 顶层契约
```
