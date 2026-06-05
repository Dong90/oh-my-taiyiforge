---
name: taiyi-review
description: TaiyiForge 第 8 阶段 — 合并前评审，产出 REVIEW.md。四端通用。
---

# taiyi-review

## 目的

合并门禁：结构、安全、可维护性，与 TEST 证据交叉验证。

## 前置（high 复杂度）

若 `guide.complexity.level === high`：

1. 跑 `taiyi-health` → `health-report.md`
2. `npx taiyi mark-aux <slug> taiyi-health`
3. 否则 `complete review` 会被引擎拒绝

## 输入

- diff、`TEST.md`、`DESIGN.md`
- （可选）`health-report.md`、`architecture-sync.md`

## 输出

- `.taiyi/changes/<slug>/REVIEW.md`

## 执行步骤

1. Findings 表：high / medium / low + 文件位置
2. Security & Trust checklist
3. 对照 TEST 执行日志与 health Verdict
4. **Verdict**：Approve 或 Request changes
5. high 未解决不得 Approve
6. `npx taiyi complete <slug> review`（**人工门**）

## 可选

- gstack `review` — 结论摘要写入 REVIEW.md

## 质量自检

- [ ] high 复杂度已 mark-aux taiyi-health
- [ ] Verdict 与 TEST 证据一致

## 禁止

- 无测试证据 Approve
- lite profile 执行（已跳过）
