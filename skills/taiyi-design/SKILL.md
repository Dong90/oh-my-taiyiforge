---
name: taiyi-design
description: TaiyiForge 第 3 阶段 — 技术设计（≥2 方案），产出 DESIGN.md。四端通用。
---

# taiyi-design

## 目的

写代码前锁定**架构决策**：至少两个可行方案 + 取舍；lite profile 可跳过本阶段。

## 输入

- `REQUIREMENT.md`、`CHANGE.md`

## 输出

- `.taiyi/changes/<slug>/DESIGN.md`

## 执行步骤

1. **Options** 表：≥2 方案，Pros / Cons / Cost
2. **Decision** + Reason（链到 AC/风险）
3. **Architecture**：组件/数据流（文字或 ASCII）
4. **Open Questions**：阻塞项不得进入 dev
5. 重大决策 → 另跑 `taiyi-architect` 写 ADR，Decision 回链 ADR 编号
6. `npx taiyi complete <slug> design`（**人工门**）

## 与 profile

- `api`：下一阶段跳过 ui-design，直接 task
- `lite`：本阶段在 skippedPhases 中，勿执行

## 质量自检

- [ ] 非唯一方案已说明为何别无选择
- [ ] Open Questions 无阻塞项未决

## 与铁三角

- gstack `plan-eng-review` — 工程评审结论写入 DESIGN 或 ADR

## 禁止

- 只有一个方案且无记录
- 在 DESIGN 写逐行实现（属 TASK）
