---
name: taiyi-test
description: TaiyiForge 第7阶段 — 测试验证，TEST.md。四端通用。
paradigm: Operator
---

# taiyi-test — 测试验证

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段门禁与推进（`status` → `continue`；legacy：`npx taiyi complete`） | 全程 |
| **GStack** | `browse` — 用于 E2E 浏览器测试和截图验证 | Round 5（E2E 轮） |
| **Superpowers** | `verification-before-completion` — 完成前全量验证 | 完成前 |

**OpenSpec / Spec-Kit / OMO** 在本阶段不涉及。

## 前置门禁（Pre-flight）

### 0.1 上游确认
- dev 阶段已过关（`.taiyi/changes/<slug>/.dev-complete` 存在且 `exitCode: 0`）
- 实现代码已通过 TDD 红→绿循环

### 0.2 Profile 判定

| Profile | TEST.md 要求 |
|---------|------------|
| `full` | 完整覆盖：5 rounds + 6 维回归测试 + 新 file GREP 填空 + Traceability |
| `api/ui` | 同 full |
| `lite` | 简化版：跳过 round 4-5，6 维回归可选 |
| `spike/micro` | 跳过本阶段 |
| `nano` | 跳过 |

### 0.3 前置检查清单
- [ ] .dev-complete 存在且有 GREEN 证据
- [ ] 明确项目的测试命令（npm test / pytest / cargo test 等）

---

## 步骤

### 工件契约

| 层 | 路径 | 职责 |
|----|------|------|
| **语义真源** | `test.json` | Zod（`src/schemas/test.ts`） |
| **生成视图** | `TEST.md` | hbs（`src/templates/test.hbs`） |
| **流程** | 本 Skill | 5 轮 AC 覆盖、6 维回归、Traceability |

**工作流**：实跑测试 → 更新 json 证据 → `scripts/taiyi-forge.sh render <slug> test` → `status` → `continue`。

详见 [`docs/taiyi/artifact-contract.md`](../../docs/taiyi/artifact-contract.md)。

### json 字段（Zod 摘要）

| 字段 | 要求 |
|------|------|
| `title` | 测试计划标题 |
| `test_plan` | ≥1 用例；`id` / `description` / `status`（passed/failed/pending） |
| `unit_framework` / `unit_coverage_target` | 可选 |
| `edge_cases` / `performance_tests` / `security_checks` | 可选 |
| `regression_plan` / `regression_items` | 可选；6 维回归仪表盘内容 |
| `mocking_boundaries` | 可选；哪些层可 mock |
| `summary` / `coverage` | 可选；执行摘要 |
| `evidence` | 有 `passed` 时推荐填真跑命令 |

### 写作指引（填入 json，render 生成 TEST.md）

### 1. TEST.md 全局结构

```
# TEST: <slug 标题>

## Overview
| AC | Round | Type | Status |
|----|-------|------|--------|
```

### 2. 按 AC 的 5 轮测试

每轮一个 table，AC 编号来自 REQUIREMENT.md：

```
### Round 1: 功能正确性（AC 正向）
| AC | PR | Test | Priority | Key Assertions |
|----|----|------|----------|----------------|

### Round 2: 边界条件（AC 负面 + 边值）
| AC | PR | Test | Priority | 边界值 |
|----|----|------|----------|--------|

### Round 3: 错误处理（AC 异常路径）
| AC | PR | Test | Priority | Error Handling |
|----|----|------|----------|---------------|

### Round 4: 集成（跨组件）
| AC | PR | Test | Priority | Endpoint / Interaction |
|----|----|------|----------|-----------------------|

### Round 5: 端到端（关键路径 / 用户流程）
| AC | PR | Test | Priority | Flow |
|----|----|------|----------|------|
```

### 3. 6 维回归测试仪表盘

每个维度用 3 态表示：✅ 通过 / ❌ 未通过 / ⬜ 不适用

```
### Regression Dashboard (pre-landing)

| Dimension | Status | Notes |
|-----------|--------|-------|
| D1 完整功能 | ✅ | 21/21 AC passed |
| D2 边界值 | ✅ | null/empty/long/edge |
| D3 性能 | ⬜ | 无性能要求 |
| D4 并发 | ✅ | 新建不冲突 |
| D5 安全 | ⬜ | 无认证逻辑 |
| D6 回滚 | ✅ | 向下兼容 |
```

### 4. 新 file GREP 填空 test（强制）

项目中没有测试文件的新文件 → agent 自动 `// src/*.ts → ` 创建一个 skeleton test file：

```
// tests/__snapshots__/placeholder.md
## GREP 发现的未覆盖文件
### <file path>
- 行号：<range>
- 状态：❌ 未覆盖
- 建议：增加 <N> 个用例覆盖 <功能>
```

---

### 5. Run Commands

所有测试命令必须进入 TEST.md：

```
## 测试执行命令

# 全部测试
$ npm test

# 单元测试
$ npx vitest run tests/unit/

# 集成测试
$ npx vitest run tests/integration/

# 特定测试
$ npx vitest run tests/unit/validation.test.ts

# 覆盖率（可选）
$ npm run test:coverage
```

### 6. Traceability 更新

```
## Traceability (←REQUIREMENT.md)

### AC → Test Coverage
| AC | 覆盖 Round | 测试文件 |
|----|-----------|---------|
| AC-1.1 | R1, R2 | tests/unit/validation.test.ts |
| AC-2.1 | R1, R3, R4 | tests/integration/translate.test.ts |
```

---

## 过关（Harness）

1. 逐项检查 `## 质量自检`；有未通过项则不要过关。
2. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 解析 `engineTruth`（`qualityReady` / `blockers`）。
3. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug>`。
4. 过关后再 `status --json --compact`，读 `engineTruth`；若 `currentPhase` 已变为 `review`，切换到 taiyi-review Skill 并通知用户。

Legacy：`npx taiyi complete <slug> test` 仍可用；聊天优先 `/taiyi:continue`。

## 产出

- `.taiyi/changes/<slug>/TEST.md`
- `.taiyi/changes/<slug>/test.json`

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-review` | Regression Dashboard → review 质量入口；测试通过证据 → review 的 QA 评估；Traceability → 审查收尾证据 |
| `taiyi-integration` | 测试通过 → 归档前提；Traceability → 集成过程中 AC 的 Final Status |

## 异常处理

| 场景 | 处理 |
|------|------|
| 测试未全部通过 | 读失败测试输出 → 归类测试 bug vs 实现 bug。实现 bug → DIAGNOSE FIX（最小修复）→ 重跑。测试 bug → 修复测试。**最多 3 轮，超限上报用户** |
| AC 未完全覆盖 | 补充第 2/3 轮测试覆盖缺失 AC，直到所有 AC 至少有一条测试 |
| 项目无测试框架 | 在 TEST.md 中说明，跳过运行但保留 Round table 作为覆盖文档 |
| 回归仪表盘有 ❌ | **不能过关 test 阶段**，必须全 ✅ 或 ⬜ 才可通过 |
| `continue` 被拒 | 检查 Traceability 是否完整、是否有 ❌ 回归。修复后 status 再 continue |
| 误过关本阶段或后续 | `scripts/taiyi-forge.sh undo <slug> test` |

<fatal_constraints>
- NEVER delete tests to make the suite pass — that is gaming the system. Fix the code or fix the test.
- NEVER skip Round 2 (边界条件) — this is where most regressions live.
- NEVER claim "tests pass" without running them — evidence before claims.
- NEVER skip GREP 填空 — every new file needs at least a skeleton test.
- NEVER skip Traceability update from REQUIREMENT.md.
</fatal_constraints>

## 质量自检

- [ ] 前置门禁已通过（0.1–0.3）
- [ ] 5 轮测试 table 完整（Round 1-5）
- [ ] 全部 AC 至少有一条测试
- [ ] 6 维回归仪表盘全部 ✅ 或 ⬜
- [ ] 新文件 GREP 填空已完成
- [ ] 所有测试命令可实际运行（非占位符）
- [ ] Traceability（AC→Test Coverage）已更新
- [ ] 全部测试通过（实跑证据）
