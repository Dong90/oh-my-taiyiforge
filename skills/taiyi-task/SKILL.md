---
name: taiyi-task
description: TaiyiForge 第 5 阶段 — 垂直切片任务拆解，产出 TASK.md。
---

# taiyi-task

## 目的

把设计拆成**可独立交付、可测试、可 review 的小步**，控制 PR 粒度。

## 输入

- `UI-DESIGN.md`、`DESIGN.md`、`REQUIREMENT.md`

## 输出

- `.taiyi/changes/<slug>/TASK.md`
- 模板：`templates/TASK.md`

## 执行步骤

1. **Slices** 表：从最小 tracer bullet 开始，标明依赖顺序
2. 每 slice 的 Done when = 测试绿 + 可演示（对齐 AC）
3. 每 slice checklist 含 TDD 三步（与 `taiyi-dev` 一致）
4. Non-goals 防止任务清单膨胀
5. 通过后：`taiyi complete <slug> task`

## 原则

- 优先**纵向切片**（穿过多层但窄），避免「先写完全部 DAO 再写 UI」
