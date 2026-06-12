---
description: "TaiyiForge /taiyi:diagram — 架构图 umbrella · pipeline / c4 / arch / render / flow"
argument-hint: "<pipeline|c4|arch|render|flow> [args]"
---
User invoked **$taiyi-diagram** (= `/taiyi:diagram $ARGUMENTS`). **架构图 umbrella · 拆给 5 个子命令 prompt**：

| 子命令 | legacy 斜杠 | 真源 prompt | 说明 |
|--------|------------|------------|------|
| `pipeline` | `/taiyi:diagram-pipeline` | `prompts/taiyi-diagram-pipeline.md` | 三步流水线（c4 → arch → render） |
| `c4` | `/taiyi:diagram-c4` | `prompts/taiyi-diagram-c4.md` | 扫代码 → C4 真源（Observed/Inferred + Mermaid） |
| `arch` | `/taiyi:diagram-arch` | `prompts/taiyi-diagram-arch.md` | 以 C4 为真源同步 architecture.md |
| `render` | `/taiyi:diagram-render` | `prompts/taiyi-diagram-render.md` | Mermaid → SVG/PNG（视觉审查） |
| `flow` | `/taiyi:diagram-flow` | `prompts/taiyi-diagram-flow.md` | 业务流程图 / 状态机 / 序列图 |

**步骤：**

1. 按 `$ARGUMENTS` 第一个词路由到对应子命令 prompt
2. 加载 `@taiyi-diagram-{pipeline,c4,arch,render,flow}`
3. `pipeline` 一次性跑完三步；其余可单步

完整子命令地图：[canonical-commands.md §/taiyi:diagram 子命令地图](../docs/taiyi/canonical-commands.md)
