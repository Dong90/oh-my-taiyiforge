---
name: taiyi-requirement
description: TaiyiForge 第2阶段 — 需求分析，REQUIREMENT.md。四端通用。
paradigm: Partner
---

# taiyi-requirement — 需求分析

## 步骤
1. 从CHANGE拆User Stories (As a/I want/So that)
2. 每条AC用 Given/When/Then
3. 提取域语言→CONTEXT.md（术语表/已锁决策/默认行为）
4. Traceability: AC↔CHANGE SC↔验证方式

## 完成
`npx taiyi complete <slug> requirement`

## 禁止
- AC含糊(无量化)
- 在REQUIREMENT写技术方案
- 跳过Traceability
