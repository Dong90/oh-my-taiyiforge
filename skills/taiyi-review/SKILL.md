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

## 内容规则（强制）

### Review Scope & Findings（Step 1）
- **Review Scope** 和 **关注重点** 必须填写（禁止空）
- **Findings ≥3 条**，覆盖至少 2 种 severity
- 每条 finding 必须有：位置（文件:行号）+ 置信度 + 建议

### Verdict & Action Items（Step 2）
- Verdict 明确：approved / commented / changes_requested
- 若 changes_requested 必须有 blocking 项
- Action items 具体可执行

### Code Quality Audit（Step 3）
- 五维评分（可读性/可测试性/一致性/复杂度/文档）
- 每维 ≥1 句改进建议（禁仅有分数无注释）

### Test Coverage Audit（Step 4）
- 各层通过率+覆盖率+状态
- 数据与 TEST.md 一致

### Security Audit（Step 5）
- ≥3 个检查项
- 每项标 ✅/❌/N/A

### Performance Audit（Step 6）
- ≥3 个检查项（DB/N+1/阻塞IO/缓存/内存泄漏/etc）
- N/A 项写理由

## 禁止残留
- Review Scope / 关注重点 留空 → 不通过
- Findings <3 条 → 不通过
- Findings 无文件:行号 → 不通过
- 笼统结论无依据 → 禁止
- Critical 未修就 Approve → 禁止
- 分数无改进注释 → 不通过

## 产出修复任务T-FIX-XX追加到TASK.md

## 自检清单
- [ ] Review Scope + 关注重点已填
- [ ] Findings ≥3 条（≥2 种 severity）
- [ ] 每条 finding 含文件:行号
- [ ] 五维评分每维有注释
- [ ] Security ≥3 检查项
- [ ] Performance ≥3 检查项
- [ ] 测试数据与 TEST.md 一致

## 禁止
- 直接改代码(只产报告)
- 笼统结论(每条须文件:行号)
- Critical未修就Approve
