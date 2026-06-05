---
name: taiyi-integration
description: TaiyiForge 第 9 阶段 — 归档与 CHANGELOG，闭环沉淀。四端通用。
---

# taiyi-integration

## 目的

合并后**文档进仓、变更可追溯、可回滚**，关闭九阶段（或 lite 五阶段）循环。

## 输入

- 已合并代码、`REVIEW.md`、`CHANGE.md`
- `state.json` 显示全部必需阶段已完成

## 输出

- `.taiyi/changes/<slug>/CHANGELOG.md`

## 执行步骤

1. Added / Changed / Fixed 写**用户可见**变更
2. Docs 勾选：README / AGENTS 是否需更新
3. **Rollback** 步骤（revert、flag、迁移 down）
4. 可选同步与归档：
   - `npx taiyi sync-openspec <slug>`（含 TEST/REVIEW/CHANGELOG）
   - `npx taiyi archive <slug>`
   - gstack `document-release`
5. `npx taiyi complete <slug> integration`

## 完成后

- `npx taiyi guide <slug>` 提示可 archive 或开新 slug
- 辅助 Skill 记录保留在 `state.auxiliaryCompleted` 供审计

## 质量自检

- [ ] CHANGELOG 与 CHANGE Success Criteria 对应
- [ ] Rollback 可执行

## 禁止

- integration 未完成就 archive
- CHANGELOG 只写内部 refactor 无用户价值（应标 Changed/Dev）
