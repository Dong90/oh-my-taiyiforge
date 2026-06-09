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

