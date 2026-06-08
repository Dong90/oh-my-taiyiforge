---
name: taiyi-diagram-render
description: TaiyiForge 辅助 — 将 C4/architecture Mermaid 渲染为 SVG/PNG（视觉审查 · 不改架构边界）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-diagram-render

## 目的

以 **上游 C4 或 architecture.md 的 Mermaid 为真源**，导出可读 **SVG**（默认）或 PNG，并做排版自检——**禁止重新扫描代码或改组件边界**。

## 何时使用

| 时机 | 说明 |
|------|------|
| 架构流水线 **第 3 步** | `/taiyi:diagram-pipeline` 自动调用 |
| C4/architecture 已写好，要预览图 | 单独 `/taiyi:diagram-render` |
| 评审/对外文档需要图片 | design 或 docs 维护 |

## 外部 Skill（可选增强）

若已安装 **`diagramming-architecture`**（architecture-diagram-skill），进入 **仅 Mermaid 模式 + 渲染约束**（见下方）；未安装则用本仓库 `render-mermaid.mjs` + Agent 目视检查。

```bash
git clone --depth 1 https://github.com/robertanton81/architecture-diagram-skill.git /tmp/arch-diag
mkdir -p ~/.cursor/skills/diagramming-architecture
cp -r /tmp/arch-diag/skill/* ~/.cursor/skills/diagramming-architecture/
```

## 输入（真源，分目录）

| 源 | 导出目录 |
|----|----------|
| `c4/context.md` · `c4/containers.md` | `c4/png/*.svg` |
| `diagrams/architecture.md` | `diagrams/png/*.svg`（**勿**写入 `c4/png/`） |

变更内路径前缀：`.taiyi/changes/<slug>/diagrams/`；仓库级：`docs/`。

## 输出

| 范围 | 路径 |
|------|------|
| 变更内 C4 | `diagrams/c4/png/*.svg` |
| 变更内工程图 | `diagrams/png/*.svg`（可选） |
| 仓库级 C4 | `docs/c4/png/*.svg` |
| 仓库级工程图 | `docs/diagrams/png/*.svg`（可选） |

导出说明见 [`docs/diagrams/pipeline.md`](../../docs/diagrams/pipeline.md)「导出图」节（**不再维护 RENDER.md**）。

**mark-aux**：`scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-render`（变更内且 `diagrams/c4/png/context.svg` 已生成）。

## 执行步骤

1. **读真源**：确认 Observed/Inferred 不在此步修改
2. **提取** 每个 ` ```mermaid ` 代码块
3. **导出 C4**（默认 SVG）：

```bash
node scripts/render-mermaid.mjs docs/c4/context.md --format svg --out docs/c4/png/
node scripts/render-mermaid.mjs docs/c4/containers.md --format svg --out docs/c4/png/

4. **可选：工程补充图**：

```bash
node scripts/render-mermaid.mjs docs/diagrams/architecture.md \
  --format svg --out docs/diagrams/png/
```

5. **高质量 / 视觉审查**（已装 diagramming-architecture 时）：
   - 禁止 `analyze_codebase.py`
   - `mmdc` 加 `-w 3200 -H 2400 -s 2` 与白底
   - 按 Visual Review checklist 迭代 ≤3 轮（重叠、箭头乱、过挤）
6. **mark-aux**（变更内）

## 约束 prompt（接 diagramming-architecture 时必用）

```text
以 <source.md> 为架构真源；禁止 analyze_codebase.py 或改组件边界。
任务：提取 mermaid → mmdc SVG → Visual Review ≤3 轮
```

## 质量自检

- [ ] SVG 与真源 mermaid 一一对应
- [ ] 未新增/删除架构节点（仅排版）
- [ ] C4 导出在 `c4/png/`，工程图在 `diagrams/png/`

## 流水线位置

```
/taiyi:diagram-c4  →  /taiyi:diagram-arch  →  /taiyi:diagram-render
```

总命令：`/taiyi:diagram-pipeline`
