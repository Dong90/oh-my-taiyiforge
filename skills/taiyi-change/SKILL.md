---
name: taiyi-change
description: TaiyiForge 第1阶段 — 变更提案，CHANGE.md。四端通用。
paradigm: Partner
---

# taiyi-change — 变更提案

## 步骤

### 0. 架构级变更检测
命中任一：1)改模块结构 2)动ADR 3)改公共契约 4)跨服务编排。命中→反问用户。

### 0.5 前端项目识别
含网站/UI/前端→判为前端。前端→路径建议(完整/中等/最短)。

### 1. 写 CHANGE.md
- Motivation: 谁痛、现状代价、改善指标
- Scope: In scope + Out of scope（至少1条"本次不做"）
- Success Criteria: 可验证(checkbox/命令/指标)
- 影响面: 是否需改REQUIREMENT/触及架构

### 2. 完成
`npx taiyi complete <slug> change --approver "名"`（人工门）

## 禁止
- 跳过CHANGE直接写REQUIREMENT
- 在CHANGE写实现细节
- Success Criteria无法映射到测试
