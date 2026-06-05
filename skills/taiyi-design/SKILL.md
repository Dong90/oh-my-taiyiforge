---
name: taiyi-design
description: TaiyiForge 第 3 阶段 — 技术设计（≥2 方案），产出 DESIGN.md。四端通用。
---

# taiyi-design

## 目的

写代码前锁定**架构决策**：至少两个可行方案 + 取舍理由；把 REQUIREMENT 的「做什么」翻译成「怎么搭」。lite profile 跳过本阶段。

## 何时使用

| 信号 | 建议 |
|------|------|
| `requirement` 已 complete | 必做（full/api） |
| 涉及 DB / 鉴权 / 跨服务 | 必做 + 考虑 `taiyi-architect` |
| lite profile | **勿执行**（在 skippedPhases） |

## 输入

- `REQUIREMENT.md`（MVP 故事与 AC）
- `CHANGE.md`（风险与约束）
- `CONTEXT.md`（既有模式）
- （可选）已有 `adr/` 目录

## 输出

- `.taiyi/changes/<slug>/DESIGN.md`
- （按需）`adr/NNNN-*.md` via `taiyi-architect`

## 执行步骤

### 1. Options 表（≥2 方案）

| Option | Summary | Pros | Cons | Cost |
|--------|---------|------|------|------|
| A | 同步导出 | 简单 | 超时 | 低 |
| B | 队列异步 | 可扩展 | 运维复杂度 | 中 |

**Cost**：人力天、依赖、迁移风险（粗估即可）。

若只有一方案，必须写 **「为何不选其他」** 小节。

### 2. Decision

- **选定方案** + **Reason**（链到 AC、风险、CONTEXT 约束）
- 重大决策：跑 `taiyi-architect` 写 ADR，Decision 引用 `ADR-0001`

### 3. Architecture

- 组件边界、数据流（ASCII / mermaid 均可）
- 错误处理、幂等、回滚策略
- 与现有模块的集成点（文件路径级）

### 4. Open Questions

| 问题 | 阻塞? | 负责人 |
|------|-------|--------|
| 队列用 Redis 还是 SQS? | 是 | 待 PO 确认 |

**阻塞项未决不得 complete design**。

### 5. 完成

1. 可选：`gstack plan-eng-review` 结论写入 DESIGN 或 ADR
2. `npx taiyi complete <slug> design`（**人工门**）

## 与 profile

| Profile | 下一主阶段 |
|---------|------------|
| `full` | `ui-design` |
| `api` | `task`（ui-design 已跳过） |
| `lite` | 本阶段跳过 |

## 与下游衔接

| 下游 | DESIGN 须提供 |
|------|----------------|
| `taiyi-ui-design` | 界面相关组件与状态（有 UI 时） |
| `taiyi-task` | 可实施边界、依赖顺序 |
| `taiyi-dev` | 技术约束与错误模型 |
| `taiyi-evolve` | 基线架构描述（漂移对比用） |

## 与铁三角

- gstack `plan-eng-review` — 工程评审
- 安全敏感：`security-review` 要点写入 DESIGN Risks

## 质量自检

- [ ] ≥2 方案或充分论证唯一方案
- [ ] Decision 可追溯到 REQUIREMENT AC
- [ ] Open Questions 无未决阻塞项
- [ ] 未写逐行实现（那是 TASK）

## 禁止

- 只有一个方案且无记录
- 在 DESIGN 写任务切片（→ TASK）
- 忽略 CONTEXT 中的既有模式
- lite profile 下执行本 Skill
