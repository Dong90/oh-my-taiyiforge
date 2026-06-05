---
name: taiyi-dev
description: TaiyiForge 第 6 阶段 — TDD 开发执行。四端通用。
---

# taiyi-dev

## 目的

按 TASK 切片（或 lite 下 REQUIREMENT AC）**测试先行**实现，产出可运行代码与 `.dev-complete` 证据。dev 是九阶段中唯一大量改仓库代码的主阶段。

## 何时使用

| 信号 | 建议 |
|------|------|
| `task` 已 complete（full/api） | 必做 |
| lite：`requirement` 后 | 直接 dev |
| `taiyi next` → `dev` | 开始编码 |

## 输入

- `TASK.md` 当前未完成切片（full/api）
- lite：`REQUIREMENT.md` AC
- Superpowers `test-driven-development`（**推荐**）
- `CONTEXT.md` 命名与测试惯例

## 输出

- 仓库内代码变更
- `.taiyi/changes/<slug>/.dev-complete`

## 执行步骤

### 1. 取当前切片

1. `npx taiyi next <slug>` 确认阶段为 dev
2. TASK 中取下一个未勾选 **T***
3. lite：按 AC 列表逐项实现

### 2. TDD 循环（每切片）

```
红 → 写失败测试
绿 → 最小实现通过
重构 → 保持测试绿
```

- 测试位置对齐项目惯例（见 CONTEXT）
- 禁止「先写实现再补假测试」

### 3. 更新 TASK

- 切片完成在 TASK 表勾选 `[x]`
- 多切片可**多轮**留在 dev 阶段，直到全部完成

### 4. 写 `.dev-complete`

**`--strict-dev` 时必填：**

```text
strict: true
command: npm test
exitCode: 0
timestamp: 2026-06-05T12:00:00Z
slices: T1,T2
```

**非 strict：** 简短 `done` 或上述格式均可。

### 5. 完成

`npx taiyi complete <slug> dev`

## 与 profile

| Profile | 驱动文档 |
|---------|----------|
| full / api | TASK.md |
| lite | REQUIREMENT.md AC |

## 与下游衔接

| 下游 | dev 应留下 |
|------|------------|
| `taiyi-test` | 可运行的测试与命令 |
| `taiyi-evolve` | 与 DESIGN 一致的实现（或已知偏差） |
| `taiyi-health` | 可 build/lint 的工程 |

## 与铁三角

- Superpowers `test-driven-development` — 红绿重构纪律
- 大改：每切片小 PR，避免 mega commit

## 质量自检

- [ ] 每个 T* / AC 有对应测试或脚本验证
- [ ] strictDev 时 `exitCode: 0` 有真实证据
- [ ] 未扩大 TASK 未列 scope
- [ ] CONTEXT 命名惯例已遵循

## 禁止

- 无测试直接 `complete dev`
- 在 dev 改 CHANGE Scope（应回到 change）
- strict 模式下伪造 exitCode
- 跳过 TASK 顺序（除非 TASK 明确可并行）
