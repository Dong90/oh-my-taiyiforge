---
name: taiyi-diagram-flow
description: TaiyiForge 辅助 — 业务流程图 / 状态机 / 序列图（Mermaid flowchart）。OpenCode / Claude / Codex / Cursor 通用。
---

# taiyi-diagram-flow

## 目的

把需求里的**用户路径、阶段门禁、错误分支、状态迁移**画成可执行的流程图——供 `TASK.md` 切片、`taiyi-dev` 实现与 `taiyi-test` 用例一一对应。

## 何时使用

| 时机 | 说明 |
|------|------|
| `taiyi-design` 有复杂分支/异步 | 主流程 + 异常流 |
| `taiyi-task` 拆切片前 | 每切片应对齐流程中的一段 |
| 九阶段 / harness / 门禁说明 | 工作流全景 flowchart |
| `taiyi-test` 写 E2E 场景 | Given/When/Then → 路径覆盖 |

可跳过：线性 CRUD、无分支、AC 已表格化且无歧义。

## 输入

- `REQUIREMENT.md`（User Stories、AC）
- `DESIGN.md`（状态、API、错误码）
- `TASK.md`（若补画 dev 级细节）
- （可选）`docs/taiyi/workflow-manifest.yaml`（官方九阶段顺序）

## 输出

| 产物 | 路径 |
|------|------|
| 主流程图 | `.taiyi/changes/<slug>/diagrams/flows.md` |
| 子流程 | `.taiyi/changes/<slug>/diagrams/flow-<name>.md` |
| 嵌入 | `REQUIREMENT.md` / `TASK.md` / `TEST.md` 内 mermaid 块 |

**mark-aux**：`scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-flow`（当 `diagrams/flows.md` 或子文件已写入实质内容）。

## 图类型选型

| 场景 | Mermaid 类型 |
|------|----------------|
| 用户/业务步骤 | `flowchart TD` 或 `flowchart LR` |
| API / 模块调用时序 | `sequenceDiagram` |
| 订单/任务/变更状态 | `stateDiagram-v2` |
| 并行网关 | `flowchart` + fork 节点说明 |
| 九阶段推进 | `flowchart LR` + subgraph 阶段 |

## 执行步骤

1. **从 AC 提取路径**：每条 AC 至少对应图中一条从入口到终态的路径
2. **标门禁节点**：人工门（change/design/review）、quality gate、delivery gate 用 **菱形** `{ }` 或 `[门禁: …]`
3. **标失败边**：每个决策点须有 **否** 分支（回退、重试、abort）——禁止只画 happy path
4. **写 flows.md**：

```markdown
# Flow Diagrams: <slug>

## Main user flow

\`\`\`mermaid
flowchart TD
  A[用户提交] --> B{校验}
  B -->|通过| C[写入]
  B -->|失败| D[4xx + 消息]
  C --> E[完成]
\`\`\`

## Taiyi 九阶段（本变更）

\`\`\`mermaid
flowchart LR
  change --> requirement --> design --> task --> dev --> test --> review --> integration
\`\`\`

## Traceability

| 节点 | AC / TASK |
|------|-----------|
| B | AC-2 |
| C | TASK-1 |
```

5. **（可选）导出 PNG**：`node scripts/render-mermaid.mjs diagrams/flows.md`
6. **回链 TASK.md**：每个切片标题旁注 `(flow: Main user flow → C)`
7. **mark-aux**

## 命名与风格

- 节点 ID：`camelCase` 或 `snake_case`，全文件唯一
- 用户可见文案用中文；内部模块用代码名（`workflow-engine`）
- 单图节点 **≤15**；超出拆 `flow-<topic>.md` 并在 flows.md 链过去
- 颜色（可选）：`classDef gate fill:#fef3c7` 标注门禁

## 质量自检

- [ ] 每条 AC 在 Traceability 表有节点或边
- [ ] 异常/回退边已画（≥1 条非 happy path）
- [ ] 与 `workflow-manifest.yaml` 阶段顺序一致（若画九阶段）
- [ ] Mermaid 语法可在预览中渲染
- [ ] TEST.md 场景 ID 可引用 `flow-*` 节

## 与主流程

- **不替代** `taiyi-requirement` 文字 AC — 流程图是 AC 的可视索引
- **taiyi-dev**：实现前对照流程图核对分支是否遗漏
- **taiyi-test**：E2E/集成用例覆盖表引用 flow 节点

## 禁止

- 只有开始→结束一条线
- 流程图与 REQUIREMENT AC 矛盾（以 REQUIREMENT 为准，改图）
- 把 LLM 臆测分支画成已确认需求（Open Questions 须标虚线或注释 proposed）
