---
name: taiyi-task
description: TaiyiForge 第 5 阶段 — 可独立 PR 的任务切片，产出 TASK.md。四端通用。
---

# taiyi-task

## 目的

把设计拆成**可独立合并、可回滚**的 dev 切片；每项有明确验收，供 `taiyi-dev` 按序 TDD 执行。lite profile 跳过本阶段。

## 何时使用

| 信号 | 建议 |
|------|------|
| `ui-design` 或 `design`（api）已 complete | 必做 |
| 多模块 / 多 PR | 必做，切片 ≤1 天 |
| lite profile | **勿执行** |

## 输入

- `DESIGN.md`
- `UI-DESIGN.md` 或 N/A 说明
- `REQUIREMENT.md`（MVP AC）
- （可选）`ui-restyle-tasks.md` 的 R*

## 输出

- `.taiyi/changes/<slug>/TASK.md`

## 执行步骤

### 1. 切片原则

- 每项 **≤1 人天**；可独立 PR、独立回滚
- 依赖显式（T2 依赖 T1）
- 验收可运行（测试名、命令、截图标准）
- TDD 顺序：**测试文件先于实现**（在描述中注明）

### 2. Slices 表

| ID | 描述 | 依赖 | 验收 | 估时 |
|----|------|------|------|------|
| T1 | 导出 API 路由 + 单测 | — | `npm test export` 绿 | 0.5d |
| T2 | 队列 worker | T1 | 集成测试 job 完成 | 1d |

视觉项引用 `R*` 或 UI-DESIGN §States。

### 3. 覆盖检查

- 对照 REQUIREMENT **全部 MVP AC**，每条至少落在一个 T*
- 未覆盖 → 补切片或回到 requirement

### 4. 完成

`npx taiyi complete <slug> task`

dev 阶段按 T1→T2… 执行，完成在 TASK 勾选。

## TASK.md 模板

```markdown
# TASK: <slug>

## Slices

| ID | 描述 | 依赖 | 验收 | Done |
|----|------|------|------|------|
| T1 | ... | — | ... | [ ] |

## AC Coverage
| AC | Slice |
|----|-------|
| US-1 | T1, T2 |
```

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-dev` | 有序 T* 列表 + 验收 |
| `taiyi-test` | 切片级测试映射 |

## 质量自检

- [ ] 每项验收可验证（命令或测试 ID）
- [ ] MVP AC 全覆盖
- [ ] 无「巨型切片」混多个无关模块
- [ ] 依赖无环

## 禁止

- 一个切片改 5 个无关目录
- 验收写「代码写好」
- lite profile 执行
- 遗漏 DESIGN Open Questions 阻塞项
