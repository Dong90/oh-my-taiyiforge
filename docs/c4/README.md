# oh-my-taiyiforge — C4 架构真源

> 由 `/taiyi:diagram-c4 --repo` 生成 · 2026-06-08  
> 下游：`/taiyi:diagram-arch` → `/taiyi:diagram-render` · 总编排：`/taiyi:diagram-pipeline`

## 1. Scope

**In scope**：本仓库 `oh-my-taiyiforge`（TaiyiForge）— npm 包、OpenCode 插件、CLI/MCP、九阶段引擎与四端 Skill 安装面。

**Out of scope**：

- 用户业务项目代码（仅通过 `.taiyi/changes/<slug>/` 工件契约交互）
- 第三方运行时（Superpowers、gstack、OpenSpec）的内部实现
- 云部署拓扑（本仓库无 Terraform/K8s 描述）

**文档范围**：System Context + Container；Component 级见 [`containers.md`](containers.md) 内 `src/core/` 分解。

---

## 2. Observations（Observed — 代码证据）

| 信号 | 证据 |
|------|------|
| npm 包名 | `package.json` → `oh-my-taiyiforge` v0.22.0 |
| 统一 CLI | `bin.taiyi` → `src/cli/taiyi.ts`；`taiyi-forge` → `scripts/taiyi-forge.mjs` |
| OpenCode 插件入口 | `main` → `src/plugin/index.ts`；`src/plugin/handlers.ts` |
| MCP 服务 | `bin.taiyi-mcp` → `src/mcp/server.ts` |
| 核心引擎 | `src/core/workflow-engine.ts` 及子模块（gates、routing、token、runtime） |
| 工作流真源 | `docs/taiyi/workflow-manifest.yaml`、`docs/taiyi/phases.yaml` |
| 聊天契约 | `skills/taiyi-*/SKILL.md`（23 个）、`prompts/taiyi-*.md` |
| 安装器 | `src/install/run.ts`（`taiyi-forge-install`） |
| 工件目录 | `.taiyi/changes/<slug>/`（`src/core/paths.ts`） |
| 集成层 | `src/integrations/`（openspec-sync、harness-hooks、skill-flow） |
| 三重门禁 | `src/core/gates/human-gate.ts`、`quality-gate.ts`、`delivery-gate.ts` |

---

## 3. Assumptions（Inferred — 推断）

| 推断 | 依据 |
|------|------|
| 开发者在本地 git 仓库中运行引擎 | `delivery-gate.ts` 检查 commit / 工作区 |
| 四端（OpenCode / Claude / Codex / Cursor）为对等聊天客户端 | `docs/taiyi/agents.yaml`、`src/install/sync-*` |
| Agent 负责写 Markdown 工件，引擎负责状态与门禁 | `AGENTS.md` 双轨约定 |
| OpenSpec / gstack / Superpowers 为可选外挂，未安装则跳过 | `workflow-manifest.yaml` harness `optional: true` |
| 无集中式远程 API；状态存本地 `.taiyi/` | 未见 HTTP server 除 MCP stdio |

---

## 4. System Context

见 [`context.md`](context.md)（C4Context Mermaid）。

---

## 5. Container view

见 [`containers.md`](containers.md)（flowchart 分层 — **流水线真源**）。L3 组件见 [`../diagrams/architecture.md`](../diagrams/architecture.md) §1。

---

## 6. Open questions

| 问题 | 影响 |
|------|------|
| 是否将 MCP 视为与 CLI 平级的「第五入口」？ | Context 图中 Actor/Container 边界 |
| `taiyi-orchestrator` 与 `harness-runner` 是否应画成独立容器？ | 当前归入引擎单容器 |
| 远程 CI 仅跑 `ci verify` 时，Delivery Gate 如何表现？ | deployment 图未覆盖 |

---

## 7. 流水线状态

| 步骤 | 状态 | 产出 |
|------|------|------|
| `/taiyi:diagram-c4 --repo` | ✅ | 本目录 |
| `/taiyi:diagram-arch --repo` | ✅ | [`../diagrams/architecture.md`](../diagrams/architecture.md) |
| `/taiyi:diagram-render --repo` | ✅ | [`png/*.svg`](png/)（见 [`../diagrams/pipeline.md`](../diagrams/pipeline.md) 导出说明） |

大版本变更后重跑：`/taiyi:diagram-pipeline --repo`
