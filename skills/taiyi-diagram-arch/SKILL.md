---
name: taiyi-diagram-arch
description: TaiyiForge 辅助 — 系统/产品架构图（Mermaid · SVG 海报 · 嵌入 DESIGN.md）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-diagram-arch

## 目的

把 `DESIGN.md` 里的文字架构落成**可读、可版本管理、可导出高清**的架构图——组件边界、数据流、部署视图、产品级全景图（Flow-X 风格海报）。

## 何时使用

| 时机 | 说明 |
|------|------|
| `taiyi-design` 写 Architecture 节 | 默认推荐（与 ASCII/mermaid 并列） |
| 新模块 / 跨服务边界 | 必做 C4 或组件图 |
| 仓库级文档 | `docs/*-architecture.svg` + PNG |
| `taiyi-evolve` 发现架构漂移 | 同步更新架构图 |

可跳过：纯文案/配置改动、无新组件且无边界变化。

## 输入

- **优先真源**：`diagrams/c4/containers.md` 或 `docs/c4/containers.md`（由 `/taiyi:diagram-c4` 产出）
- `REQUIREMENT.md`、`DESIGN.md`（Decision + Architecture 草稿）
- `CONTEXT.md`（既有模块与路径）
- （可选）`adr/`、`docs/ARCHITECTURE.md`

流水线第 2 步：加载本 Skill 时**同步** C4 真源，勿重新划分模块。总编排：`/taiyi:diagram-pipeline`。

## 输出（择一或组合）

| 产物 | 路径 | 适用 |
|------|------|------|
| 变更内架构说明 | `.taiyi/changes/<slug>/diagrams/architecture.md` | 九阶段工件（**mark-aux 检测**） |
| 嵌入 DESIGN | `DESIGN.md` § Architecture 内 mermaid 代码块 | 轻量变更 |
| 矢量海报 | `diagrams/architecture.svg` + `architecture.png` | 产品/对外文档 |
| 仓库级 | `docs/<name>-architecture.svg` | 本仓库参考：`docs/taiyiforge-architecture.svg` |

**mark-aux**：独立文件路径时执行 `scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-arch`。

## 图类型选型

| 问题 | 推荐图型 | 工具 |
|------|----------|------|
| 模块谁依赖谁 | `graph TB` / `graph LR` | Mermaid |
| 请求怎么走 | `sequenceDiagram` | Mermaid |
| 部署/运行时 | `graph` + subgraph 环境 | Mermaid |
| 产品全景（六大标准+九阶段+门禁） | 分栏海报 SVG | Python 脚本或手调 SVG |
| C4 容器级 | Mermaid C4（若渲染器支持）或结构化 graph | Mermaid |

## 执行步骤

0. **若存在 `diagrams/c4/containers.md`**：以其为节点/边界真源；顶部加 `> C4 真源：diagrams/c4/containers.md`
1. **读 DESIGN Decision**：只画「已选定方案」，不把未选 Option 画进主图
2. **列节点清单**：组件名 = 仓库内真实路径/包名（如 `src/core/workflow-engine.ts`）
3. **选视图**：默认 1 张组件图 + 1 张关键序列图（有外部 API 时）
4. **写 Mermaid**（变更内首选）：

```markdown
# Architecture Diagram

## Component view

\`\`\`mermaid
graph LR
  CLI[taiyi CLI] --> Engine[workflow-engine]
  Engine --> Manifest[workflow-manifest.yaml]
  Engine --> Skills[skills/taiyi-*]
\`\`\`

## Notes

- 与 DESIGN.md §Decision 一致
- 更新日期：ISO8601
```

5. **（可选）导出 PNG**：`node scripts/render-mermaid.mjs .taiyi/changes/<slug>/diagrams/architecture.md`
6. **（产品海报）** 宽屏分栏布局参考 `docs/taiyiforge-architecture.svg`；可 fork `scripts/generate-architecture-svg.py` 改文案后重跑
7. **回链 DESIGN.md**：Architecture 节写 `详见 diagrams/architecture.md` 或内嵌同一段 mermaid
8. **mark-aux**（若写了独立 diagrams 文件）

## 视觉规范（对齐 Flow-X / TaiyiForge 海报）

- 画布：宽屏 16:9 或 3:2（如 2800×1880 SVG viewBox）
- 背景：深色 `#060b16`，面板 `#0d1528`，文字 `#eef2ff`
- 结构：**顶栏标准 → 左 ARTIFACT → 中 CORE + 九阶段 → 右门禁 → 底 Skill 全景 → 页脚价值**
- 导出清晰度：SVG 真源 + PNG **≥5×**（本仓库：`python3 scripts/generate-architecture-svg.py` → 16800×11280）

## 质量自检

- [ ] 每个框可映射到 REQUIREMENT AC 或 DESIGN 组件表
- [ ] 箭头方向与数据/控制流一致（无「悬空节点」）
- [ ] 图例或 Notes 说明缩写与边界（Trust boundary、DB、外部 SaaS）
- [ ] Mermaid 在 GitHub / Cursor 预览可渲染（避免实验语法）
- [ ] 若与旧图冲突，在 Notes 标 **supersedes** 路径

## 与主流程

```
taiyi-requirement → taiyi-design
                         ↓
              taiyi-diagram-arch（推荐）
              taiyi-diagram-flow（流程细节）
                         ↓
                    DESIGN.md + diagrams/
```

## 禁止

- 无 DESIGN 决策就画「最终架构」
- 架构图代替 ADR（边界决策仍走 `taiyi-architect`）
- 仅截图无源文件（须保留 `.md` / `.svg` 可 diff 真源）
