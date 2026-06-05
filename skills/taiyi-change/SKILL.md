---
name: taiyi-change
description: TaiyiForge 第 1 阶段 — 变更提案，产出 CHANGE.md。OpenCode / Claude / Codex 通用。
---

# taiyi-change

## 目的

对齐**为什么要做**、**做什么 / 不做什么**、**如何验收与回滚**，避免在聊天里隐式改 scope。

## 输入

- 用户意图、Issue、或产品 brief

## 输出

- 工件：`.taiyi/changes/<slug>/CHANGE.md`
- 模板：`templates/CHANGE.md`

## 执行步骤

1. 用 `templates/CHANGE.md` 起草，填满 Motivation / Scope / Risks / Success Criteria
2. Success Criteria 必须**可验证**（可测试、可演示、可度量）
3. 明确 **Out of scope**，防止范围蔓延
4. 自检五维：完整、一致、可验证、可追溯、工程质量（文档级）
5. 请求人工确认（OMO）后推进：`taiyi_complete` / `taiyi complete <slug> change`

## 禁止

- 跳过 CHANGE 直接写代码或 REQUIREMENT
- 把未决风险藏在实现细节里
