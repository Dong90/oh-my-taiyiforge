---
name: taiyi-design
description: TaiyiForge 第3阶段 — 技术设计(≥2方案)，DESIGN.md。四端通用。
paradigm: Architect
---

# taiyi-design — 技术设计

## 步骤

### 0. 既有架构对齐(Brownfield)
- 列出触碰模块/新增模块/禁动清单
- 对齐既有抽象，禁止"顺便引新库"
- 沿用模式vs引入新模式（须充分理由）

### 1. Options表(≥2方案)
方案+Pros+Cons+Cost

### 2. Decision
选定+理由+取舍。每条决策：备选→理由→代价

### 3. Architecture + Open Questions

### 9. 架构沉淀建议
入选阈值：可复用抽象/项目级决策/跨模块契约/依赖变动。无则写"无建议"

## 完成
`npx taiyi complete <slug> design --approver "名"`(人工门)

## 禁止
- 单方案无记录
- 在DESIGN写任务切片
- "使用最佳实践"空话
