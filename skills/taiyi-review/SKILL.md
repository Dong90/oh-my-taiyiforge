---
name: taiyi-review
description: TaiyiForge 第8阶段 — 合并前评审，REVIEW.md。四端通用。
paradigm: Momus
---

# taiyi-review — 合并前评审

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段门禁与推进（`status` → `continue --approver`；legacy：`npx taiyi complete`） | 全程 |
| **GStack** | `review` — 使用 GStack review 做 diff 安全分析 | Round 1 FR 步骤前（可选） |
| **OMO** | 作为 review 门控的工作流入口 | 全程 |

**Superpowers / OpenSpec / Spec-Kit** 在本阶段不涉及。

## 前置门禁（Pre-flight）

### 0.1 上游确认
- test 阶段已过关（TEST.md 存在，测试全部通过）
- README.md、CLAUDE.md 等文档的 Diff 已确认
- 当前 git 分支对比 base 的完整 Diff 可读

### 0.2 Profile 判定

| Profile | REVIEW.md 要求 |
|---------|--------------|
| `full` | 4 rounds 完整评审（diff/架构/测试/文档）+ 修订循环 + ⭐ 总体评分 |
| `api/ui` | 同 full |
| `lite` | 简化为 3 rounds（跳过架构评审）+ 修订循环 + ⭐ 评分 |
| `spike/micro` | 简化到 1 round（代码可读性）+ ⭐ 评分 |
| `nano` | 跳过 |

### 0.3 前置检查清单
- [ ] TEST.md 存在且测试全部通过
- [ ] git diff 与 base 分支的差异已清楚（`git diff base-branch..HEAD --stat`）
- [ ] 无未提交的改动

---

## 步骤

### 工件契约

| 层 | 路径 | 职责 |
|----|------|------|
| **语义真源** | `review.json` | Zod（`src/schemas/review.ts`） |
| **生成视图** | `REVIEW.md` | hbs（`src/templates/review.hbs`） |
| **流程** | 本 Skill | 4 rounds、修订循环、⭐ 评分 |

**工作流**：review-loop 机器审查 → 更新 json findings → `render <slug> review` → `status` → `continue --approver "名"`。

详见 [`docs/taiyi/artifact-contract.md`](../../docs/taiyi/artifact-contract.md)。

### json 字段（Zod 摘要）

| 字段 | 要求 |
|------|------|
| `title` | 评审标题 |
| `findings` | `severity` / `description` / `file` / `line` / `resolved` |
| `code_quality` | 可选；⭐ 各维度 1–5 |
| `test_coverage` | 可选；层覆盖摘要 |
| `blocking_items` / `suggestion_items` | 可选 |
| `verdict` / `summary` | 可选；合并门槛与总结 |

除更新 Finding 状态外，**不要**手改 reviewer 生成的 REVIEW.md 结构；结构化数据以 `review.json` 为准。

### 写作指引（填入 json，render 生成 REVIEW.md）

除了修改实现外，不要修改 reviewer agent 生成的 REVIEW.md 内容。

### 1. Round 1 — 功能性 FR（Diff 角度）

审查 git diff 中的每个改动（逐文件），检查：
- 逻辑正确性（边界、竞态、类型安全）
- 与 AC 的一致性（每段代码能不能追踪到某条 AC？）
- 错误处理完整（每条错误路径有 check / catch）
- Scope 管控（改动是否超出 TASK.md write_files？）

输出格式 — 每个 finding 一条：

```
### FR-1: [标题]
**File**: `src/foo/bar.ts:45`
**Issue**: [一句话描述问题]
**Severity**: critical / major / minor
**Suggestion**: [具体修改建议]
**AC Trace**: AC-1.2, AC-3.1
```

### 2. Round 2 — 架构 AR（方案角度）

审查实现与 DESIGN.md 的一致性：
- 是否遵循了选定的架构方案？
- 是否有新的抽象或模式未在 DESIGN 中讨论？
- DB Schema / API 签名是否与 DESIGN 一致？

```
### AR-1: [标题]
**File**: `src/foo/bar.ts`
**Issue**: [架构级问题，如偏离了 DESIGN.md 选定的方案]
**Severity**: critical / major / minor
**Suggestion**: [重构或补充方案]
```

### 3. Round 3 — 测试 TR（覆盖角度）

审查测试覆盖率：
- 全部 AC 是否有测试覆盖？
- 边界值是否覆盖？
- 负测试（错误路径）是否存在？

### 4. Round 4 — 文档 DR（交付角度）

- README.md 是否需要更新？
- CLAUDE.md / AGENTS.md 是否需要更新？
- CHANGELOG.md 条目是否合理？
- API 文档 / 迁移指南是否需要更新？

---

### 5. 修订循环（resolve findings）

对每个 `critical` / `major` finding → agent 修复 → 提交 → 重跑测试 → 更新 REVIEW.md Finding 状态为 "Resolved"。

修订循环规则：
- **critical**: 必须全部 resolved 才能过关（`continue`）
- **major**: 至少 80% resolved，剩余标注为 deferred（需人工确认）
- **minor**: 可选，可全部 deferred

### 6. ⭐ 总体评分

```
## ⭐ 总体评分

| 维度 | Score (1-5) | 备注 |
|------|------------|------|
| 功能性 | 5 | 所有 AC 满足 |
| 架构 | 4 | 方案一致，Singleton 模式不完全适用 |
| 测试 | 5 | 边界/错误路径全覆盖 |
| 文档 | 5 | README/CLAUDE.md 已更新 |
| 维护性 | 4 | 部分函数可进一步拆分 |

**汇总**: 4.6 / 5.0 — 可合并
```

**合并门槛**：
- 汇总 < 3.5 → 不可合并，需要大改
- 3.5 ≤ 汇总 < 4.0 → 有条件合并，major findings 标注 deferred 需人工确认
- 汇总 ≥ 4.0 → 可合并

---

## 过关（Harness）

1. 逐项检查 `## 质量自检`；有未通过项则不要过关。
2. **机器审查**（review 阶段强制）：`scripts/taiyi-forge.sh review-loop <slug>` 或 `/taiyi:review-loop`，直到无 blocking findings（见 `engineTruth` / review-loop 输出）。
3. **health 门禁**（仅当 `status` 显示 medium/high 复杂度且未 `mark-aux`）：加载 `@taiyi-health` → 产出 `health-report.md` → `scripts/taiyi-forge.sh mark-aux <slug> taiyi-health`。
4. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 解析 `engineTruth`（`qualityReady` / `blockers`）。
5. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug> --approver "名"`（review 人工门）。
6. 过关后再 `status --json --compact`，读 `engineTruth`；若 `currentPhase` 已变为 `integration`，切换到 taiyi-integration Skill 并通知用户。

Legacy：`npx taiyi complete <slug> review --approver "名"` 仍可用；聊天优先 `/taiyi:continue`。

## 产出

- `.taiyi/changes/<slug>/REVIEW.md`
- `.taiyi/changes/<slug>/review.json`

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-integration` | REVIEW.md → 归档的必要附件；修订记录 → 变更历史；⭐ 评分 → 归档报告的重要组成部分 |

## 异常处理

| 场景 | 处理 |
|------|------|
| git diff 为空（无改动） | 评审所有已过关阶段的 artifact（CHANGE/REQUIREMENT/DESIGN/TASK/TEST），检查一致性 |
| 发现 critical 问题 | agent 立即修复 → 测试 → 更新 REVIEW.md。不要等待人工 |
| 修订循环中测试挂了 | 修复 → 更新 Finding 状态 → 重跑全部测试。**不删除 finding** |
| 汇总 < 3.5 | **不能过关 review 阶段**，列出需要大改的项目，等用户指示 |
| 人工 reviewer 建议大改 | 走修订循环，每次走完检查 diff + regress 测试。禁止直接 apply 所有建议 |
| 误过关本阶段或后续 | `scripts/taiyi-forge.sh undo <slug> review` |

<fatal_constraints>
- NEVER modify the generated REVIEW.md content except to update Finding status from "Open" to "Resolved" or marking as "Deferred".
- NEVER skip the 修订循环 for critical/major findings — they must be addressed before completion.
- NEVER claim a review is complete without a ⭐ 总体评分.
- NEVER skip 架构审查 (Round 2) for full/api/ui profiles.
- NEVER manually cherry-pick which findings to resolve — follow severity priority (critical → major → minor).
- NEVER advance with ⭐ < 4.0 unless user explicitly approves deferred items.
</fatal_constraints>

## 质量自检

- [ ] 前置门禁已通过（0.1–0.3）
- [ ] review-loop 已通过（无 blocking）
- [ ] health 门禁已满足（若 status 要求）
- [ ] Round 1-4 全部完成（功能性/架构/测试/文档）
- [ ] 每条 Finding 有 severity 标签 + 文件:行号
- [ ] 修订循环已完成：critical 全部 resolved，major ≥ 80% resolved
- [ ] ⭐ 总体评分已给出
- [ ] 汇总 ≥ 3.5（合并门槛）
- [ ] REVIEW.md 没有被 AI 大幅修改——只更新了 Finding 状态
- [ ] 全部测试在修订后重新通过
