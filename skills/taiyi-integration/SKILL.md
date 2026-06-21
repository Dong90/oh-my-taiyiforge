---
name: taiyi-integration
description: TaiyiForge 第9阶段 — 闭环归档，CHANGELOG.md。四端通用。
paradigm: Operator
---

# taiyi-integration — 闭环归档

## 步骤
1. 跑全套自动化(npm test + build)，贴真实输出
2. 引导UAT逐条验收(通过/失败)
3. 失败诊断: root cause→fix-plan→回dev修→重跑。≤3轮
4. LESSONS提名: 扫SUMMARY"决策与偏离"。耗时>30min/不限于本任务→提名
5. CHANGELOG: Added/Changed/Fixed + Success Criteria Met
6. Rollback: 可执行步骤

## 完成
`npx taiyi complete <slug> integration` → `archive`

## 禁止
- 失败重试>3轮不暂停
- CHANGELOG只写refactor
- 在integration改CONTEXT.md
