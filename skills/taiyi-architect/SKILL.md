---
name: taiyi-architect
description: TaiyiForge 辅助 — 架构决策记录 ADR（GStack 深化）。
---

# taiyi-architect

## 何时使用

- DESIGN 阶段存在长期影响的决策（数据库、鉴权模型、跨服务边界）

## 输出

- `.taiyi/changes/<slug>/adr/NNNN-<slug>.md`

## ADR 结构

1. **Status**：proposed | accepted | deprecated
2. **Context**
3. **Decision**
4. **Consequences**（正/负）
5. **Alternatives considered**

## 与主流程关系

- ADR 摘要应回写 `DESIGN.md` 的 Decision 节
- 不替代 `taiyi-design`，而是补充可追溯决策
