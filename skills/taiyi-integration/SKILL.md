---
name: taiyi-integration
description: TaiyiForge 第 9 阶段 — 归档与 CHANGELOG，闭环沉淀。
---

# taiyi-integration

## 目的

合并后**文档进仓、变更可追溯、可回滚**，完成 TaiyiForge 九阶段闭环。

## 输入

- 已合并代码、`REVIEW.md`、`CHANGE.md`

## 输出

- `.taiyi/changes/<slug>/CHANGELOG.md`
- 模板：`templates/CHANGELOG.md`

## 执行步骤

1. 按 Added / Changed / Fixed 写用户可见变更
2. Docs / Skills 勾选：对外行为变则更新 README / AGENTS
3. Rollback：写清回滚步骤（feature flag、revert、迁移 down）
4. 可选：**OpenSpec** `openspec archive <id>`、**gstack** `document-release`、发版 tag
5. 通过后：`taiyi complete <slug> integration`

## 完成标志

- 九阶段 `state.json` 中 `integration` 已完成；变更可归档或关闭 Issue
