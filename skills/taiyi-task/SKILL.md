---
name: taiyi-task
description: TaiyiForge 第 5 阶段 — 可独立 PR 的任务切片，产出 TASK.md。四端通用。
---

# taiyi-task

## 目的

把设计拆成**可独立合并**的 dev 切片，每项可追踪、可回滚。

## 输入

- `DESIGN.md`、`UI-DESIGN.md`（或 N/A）
- （可选）`ui-restyle-tasks.md` 的 R* 编号

## 输出

- `.taiyi/changes/<slug>/TASK.md`

## 执行步骤

1. **Slices** 表：ID、描述、依赖、验收、预估
2. 每项 ≤1 天；视觉项引用 R* / UI-DESIGN 章节
3. 标 TDD 顺序：测试文件先于实现
4. `npx taiyi complete <slug> task`
5. dev 阶段按 T1、T2… 顺序执行，完成勾选自 TASK

## 切片格式

| ID | 描述 | 依赖 | 验收 |
|----|------|------|------|
| T1 | 添加 API 路由 | — | 单元测试绿 |

## 质量自检

- [ ] 每项验收可验证
- [ ] 覆盖 REQUIREMENT 全部 MVP AC

## 禁止

- 一个切片混多个无关模块
- lite profile 执行（已跳过）
