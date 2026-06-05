---
name: taiyi-test
description: TaiyiForge 第 7 阶段 — 测试计划与 AC 覆盖证据，产出 TEST.md。
---

# taiyi-test

## 目的

证明实现满足 REQUIREMENT，而不仅是「跑过几条 happy path」。

## 输入

- 已完成的代码与测试、`REQUIREMENT.md`、`TASK.md`

## 输出

- `.taiyi/changes/<slug>/TEST.md`
- 模板：`templates/TEST.md`

## 执行步骤

1. Test Plan：unit / integration / e2e 及实际命令
2. Coverage vs AC 表：每条 AC 有证据（测试名、截图、日志）
3. 运行测试，勾选 Results；失败不得 complete
4. Gaps 诚实列出 follow-up
5. 通过后：`taiyi complete <slug> test`

## 禁止

- 未运行测试就勾选通过
