---
name: taiyi-diagram-pipeline
description: TaiyiForge 辅助 — 架构图三步流水线编排（C4 真源 → 工程图同步 → PNG 渲染）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-diagram-pipeline

## 目的

一条命令串联架构图流水线，避免三个 Skill 各扫一遍代码产出三套不一致的图。

## 斜杠命令

| 步骤 | 命令 | Skill |
|------|------|-------|
| 1 C4 真源 | `/taiyi:diagram-c4 [slug] [--repo] [--scope path]` | taiyi-diagram-c4 |
| 2 工程图同步 | `/taiyi:diagram-arch [slug] [topic]` | taiyi-diagram-arch |
| 3 导出图 | `/taiyi:diagram-render [slug] [--repo] [--review]` | taiyi-diagram-render |
| **总编排** | `/taiyi:diagram-pipeline [slug] [--repo] [--scope path] [--skip-render]` | 本 Skill |

## 何时使用

- 维护仓库级 `docs/c4/` + `docs/diagrams/architecture.md`
- design 阶段一次性产出变更内 `diagrams/c4/` + `diagrams/architecture.md` + PNG
- onboarding：从代码到可评审架构图

**不替代** `/taiyi:diagram-flow`（九阶段/门禁流程图）。

## 参数

| 参数 | 含义 |
|------|------|
| `slug` | 活动变更；省略且仅一个 active 时可推断 |
| `--repo` | 仓库级输出到 `docs/c4/`、`docs/diagrams/`（无 mark-aux） |
| `--scope path` | C4 扫描子目录（传给 diagram-c4） |
| `--skip-render` | 只跑 ①②，不导出 PNG |
| `--review` | 第 3 步优先 diagramming-architecture 视觉审查（较慢） |

## 执行顺序（Agent 必须按序）

### Step 1 — `/taiyi:diagram-c4`

加载 **taiyi-diagram-c4**（或 c4-codebase-architecture）。产出 `diagrams/c4/README.md` + `containers.md`（或 `docs/c4/`）。

**门禁**：`containers.md` 含可渲染 mermaid 且 Observed/Inferred 已分节 → 否则停止，不进入 Step 2。

### Step 2 — `/taiyi:diagram-arch`

加载 **taiyi-diagram-arch**。以 Step 1 的 `containers.md` 为真源：

- 同步到 `diagrams/architecture.md`（或 `docs/diagrams/architecture.md`）
- 在 architecture 顶部回链：`> C4 真源：diagrams/c4/containers.md`
- **禁止**重新划分模块；可补充序列图、Notes
- `mark-aux taiyi-diagram-arch`（变更内）

### Step 3 — `/taiyi:diagram-render`（除非 `--skip-render`）

加载 **taiyi-diagram-render**。以 Step 1 c4 mermaid 导出 `c4/png/*.svg`；可选将 Step 2 `architecture.md` 导出到 `diagrams/png/`。

- `mark-aux taiyi-diagram-render`（变更内）

### 完成摘要

向用户报告：

```text
Pipeline 完成
  C4:     <path/to/containers.md>
  Arch:   <path/to/architecture.md>
  PNG:    <path/to/png/>  (或 skipped)
  mark-aux: diagram-arch [, diagram-c4, diagram-render]
```

## 读优先

- `docs/diagrams/pipeline.md` — 路径约定与示例

## 与 design 阶段

`taiyi-design` 推荐：大改/陌生代码用 `/taiyi:diagram-pipeline`；轻量变更仅 `/taiyi:diagram-arch`。
