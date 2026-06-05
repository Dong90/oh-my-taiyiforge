---
name: taiyi-design
description: TaiyiForge 第 3 阶段 — 技术设计（GStack 三选项），产出 DESIGN.md。
---

# taiyi-design

## 目的

在写 UI / 任务 / 代码前锁定**架构决策**：至少两个可行方案 + 取舍理由。

## 输入

- `REQUIREMENT.md`、`CHANGE.md`

## 输出

- `.taiyi/changes/<slug>/DESIGN.md`
- 模板：`templates/DESIGN.md`

## 执行步骤

1. **Options** 表：≥2 个方案，填 Pros / Cons / Cost（时间、复杂度、运维）
2. **Decision**：选定方案 + Reason（可引用 AC 或风险）
3. **Architecture**：组件/数据流（文字或 ASCII，够用即可）
4. **Open Questions**：未决项列 checklist；阻塞项不得进入 dev
5. 通过后：`taiyi complete <slug> design`

## GStack 纪律

- 禁止「只有一个方案」除非记录为何别无选择
- 重大决策可另开 `taiyi-architect` 写 ADR
