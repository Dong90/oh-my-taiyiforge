---
name: taiyi-test
description: TaiyiForge 第 7 阶段 — 测试计划与运行证据，产出 TEST.md。四端通用。
---

# taiyi-test

## 目的

证明实现满足 AC：**测什么、怎么跑、实际结果**（非口头声明）。

## 输入

- `REQUIREMENT.md` AC
- 代码与 `.dev-complete`
- （可选）`taiyi-evolve` 若设计有漂移

## 输出

- `.taiyi/changes/<slug>/TEST.md`

## 执行步骤

1. **Test Plan** 表：层级（单元/集成/E2E）、命令、覆盖 AC
2. **实际运行**每条命令，记录退出码与日期
3. 附 CI run URL 或终端摘要
4. high 复杂度建议在 test 后跑 `taiyi-evolve`
5. `npx taiyi complete <slug> test`

## 证据格式

```markdown
## Execution Log

| 命令 | 退出码 | 时间 |
|------|--------|------|
| npm test | 0 | 2026-06-05 |
```

## 质量自检

- [ ] 每条 MVP AC 有对应用例或手动步骤
- [ ] 含真实 exitCode（Superpowers verification-before-completion）

## 与铁三角

- Superpowers `verification-before-completion`

## 禁止

- 未跑测试写「已通过」
- TEST 与 REQUIREMENT AC 无映射
