---
name: taiyi-review
description: TaiyiForge 第8阶段 — 合并前评审，REVIEW.md。四端通用。
paradigm: Scout
---

# taiyi-review — 三轮审查

## 第一轮 · Spec合规
AC是否实现+测试覆盖+是否范围蔓延

## 第二轮 · 代码质量(6维衰退R1-R6)
每条诊断: Symptom/Source/Consequence/Remedy + 文件:行号

## 第三轮 · UI视觉(仅前端)
Design Tokens一致性(禁硬编码hex→🔴Critical)+无障碍快检

## 第四轮 · 跨模型spot-check(可选)
涉安全/函数>80行→另一模型跑同样审查

## 严重度
🔴Critical/🟡Major/🟢Minor

## 产出修复任务T-FIX-XX追加到TASK.md

## 禁止
- 直接改代码(只产报告)
- 笼统结论(每条须文件:行号)
- Critical未修就Approve
