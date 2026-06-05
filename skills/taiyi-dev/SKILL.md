---
name: taiyi-dev
description: TaiyiForge 第 6 阶段 — TDD 开发执行。Claude / Codex / Cursor 通用。
---

# taiyi-dev · 开发执行（TDD）

## 输入

- `TASK.md`、`DESIGN.md`、`UI-DESIGN.md`

## 输出

- 实现代码 + 自动化测试
- `.taiyi/changes/<slug>/.dev-complete`（引擎校验）

## TDD 纪律

1. RED — 一条行为的失败测试  
2. GREEN — 最小实现  
3. REFACTOR — 保持 GREEN  
4. 禁止先写完全部测试

## 门禁

质量五维 + 人工审批（OMO）通过后，由 `taiyi complete` 或引擎 API 推进阶段。
