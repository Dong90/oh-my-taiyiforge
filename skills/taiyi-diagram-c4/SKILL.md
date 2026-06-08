---
name: taiyi-diagram-c4
description: TaiyiForge 辅助 — 从代码反推 C4 架构文档（Observed/Inferred 分层 · Mermaid 真源）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-diagram-c4

## 目的

扫描仓库代码，产出 **C4 架构真源文档**（Scope · Observed · Inferred · Mermaid），供后续 `/taiyi:diagram-arch` 与 `/taiyi:diagram-render` 引用——**不重复猜模块边界**。

## 何时使用

| 时机 | 说明 |
|------|------|
| 架构流水线 **第 1 步** | `/taiyi:diagram-pipeline` 自动调用 |
| 陌生代码库 / 大重构 | 单独 `/taiyi:diagram-c4` |
| design 前需证据级架构 | 先于 `taiyi-diagram-arch` |

可跳过：纯文案改动、模块边界已在 DESIGN 冻结且无代码漂移。

## 外部 Skill（可选增强）

若已安装开源 **`c4-codebase-architecture`**，加载它并遵循其 Observed/Inferred 纪律；未安装则按本 Skill 执行同等流程。

```bash
npx skills add lmammino/c4-codebase-architecture-skill --skill c4-codebase-architecture -a cursor
```

## 输入

- 仓库根或 `--scope <path>`（如 `src/core`）
- （变更内）`REQUIREMENT.md`、`DESIGN.md`、`CONTEXT.md`
- `docs/ARCHITECTURE.md`（若有）

## 输出

| 范围 | 路径 |
|------|------|
| **变更内**（默认，有 active slug） | `.taiyi/changes/<slug>/diagrams/c4/README.md`、`containers.md`、可选 `context.md` |
| **仓库级**（`--repo` 或无 slug） | `docs/c4/README.md`、`docs/c4/containers.md`、可选 `docs/c4/context.md` |

**mark-aux**：`scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-c4`（变更内且 `diagrams/c4/containers.md` 有实质内容）。

## 执行步骤

1. **定范围**：全仓库 / `src/core` / 单服务；写明 in-scope / out-of-scope
2. **扫证据**：入口（`src/cli`、`src/plugin`）、`package.json`、`workflow-manifest.yaml`、部署/CI 描述
3. **写 README.md**：Scope · Observations（Observed）· Assumptions（Inferred）· Open questions
4. **写 containers.md**：`C4Container` 或结构化 `graph TB` Mermaid；节点用真实路径/包名
5. **（可选）context.md**：仅当存在明确外部系统/用户角色时
6. **禁止**：把未确认推断写成 Observed；不要在此步导出 PNG（交给 `/taiyi:diagram-render`）

## 质量自检

- [ ] Observed 与 Inferred 分节
- [ ] 每个容器可映射到仓库路径
- [ ] Mermaid 在 GitHub 预览可渲染
- [ ] README 注明下游：`/taiyi:diagram-arch` → `/taiyi:diagram-render`

## 流水线位置

```
/taiyi:diagram-c4  →  /taiyi:diagram-arch  →  /taiyi:diagram-render
     (本 Skill)          (同步工程图)            (PNG + 视觉审查)
```

总命令：`/taiyi:diagram-pipeline`
