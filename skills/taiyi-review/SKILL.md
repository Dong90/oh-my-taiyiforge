---
name: taiyi-review
description: TaiyiForge 第 8 阶段 — 合并前评审，产出 REVIEW.md。
---

# taiyi-review

## 目的

合并门禁：结构、安全、可维护性，与 TEST 证据交叉验证。

## 输入

- 代码 diff、`TEST.md`、`DESIGN.md`

## 输出

- `.taiyi/changes/<slug>/REVIEW.md`
- 模板：`templates/REVIEW.md`

## 执行步骤

1. Findings 表按 high / medium / low 分级，带文件位置
2. Security & Trust checklist
3. Verdict：Approve 或 Request changes（阻塞项写清）
4. high 未解决不得 Approve
5. 通过后：`taiyi complete <slug> review`

## 可选（铁三角）

- 复杂 diff 前跑 `taiyi-health` 拿质量基线
- **gstack review**：`gstack review` 做 PR 级结构审查，结论摘要写入 REVIEW.md
- **Superpowers**：`verification-before-completion` — 无测试/截图证据不得 Approve

详见 `docs/taiyi/integrations.md`
