---
name: taiyi-dev
description: TaiyiForge 第 6 阶段 — TDD 开发执行。四端通用。
---

# taiyi-dev

## 目的

按 TASK 切片**测试先行**实现，产出可运行代码与 dev 完成标记。

## 输入

- `TASK.md` 当前切片
- Superpowers `test-driven-development`（推荐）

## 输出

- 代码变更（仓库内）
- `.taiyi/changes/<slug>/.dev-complete`

## 执行步骤

1. 取 TASK 下一未完成切片 T*
2. **红**：写失败测试
3. **绿**：最小实现
4. **重构**：保持测试绿
5. 切片完成在 TASK 勾选
6. 全部切片完成后写 `.dev-complete`：

```text
strict: true
command: npm test
exitCode: 0
timestamp: 2026-06-05T12:00:00Z
slices: T1,T2
```

7. `init --strict-dev` 时上述格式**必填**；否则简短 `done` 即可
8. `npx taiyi complete <slug> dev`

## 与 profile

- `lite`：requirement 后直接 dev，TASK 已跳过——按 REQUIREMENT AC 直接实现

## 质量自检

- [ ] 每个 T* 有对应测试或脚本验证
- [ ] strictDev 时 exitCode: 0 有证据

## 禁止

- 跳过测试直接 complete dev
- 扩大 TASK 未列 scope
