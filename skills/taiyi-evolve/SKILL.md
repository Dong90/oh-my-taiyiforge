---
name: taiyi-evolve
description: TaiyiForge 辅助 — 实现后架构与文档同步（architecture-sync）。
---

# taiyi-evolve

## 何时使用

- dev 完成后发现 DESIGN 与代码漂移
- 多 slice 合并后需更新架构图 / 模块边界说明

## 输出

- `.taiyi/changes/<slug>/architecture-sync.md`

## 执行步骤

1. diff 实现 vs `DESIGN.md`
2. 列出**已变**与**仍准确**的章节
3. 提议 `DESIGN.md` 补丁（或 PR 内直接更新）
4. 若决策变化，触发 `taiyi-architect` 新 ADR

## 禁止

- 静默改架构不留文档
