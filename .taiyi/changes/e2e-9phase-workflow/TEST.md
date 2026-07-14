---
phase: test
skill: taiyi-test
gate: auto
produces: TEST.md
upstream: [task, dev]
downstream: [review]
---
<!-- phase:test skill:taiyi-test gate:auto est:20min produces:TEST.md upstream:[task,dev] downstream:[review] cplx:[ALL]5steps +[M+]4 +[H]2 -->
# TEST: E2E 九阶段全流程集成测试

> **策略**: 覆盖单元/集成/E2E 三层测试

---

## Test Plan

> **[ALL]** Goal: 三层覆盖有目标 | Inputs: TASK.md + 实现代码
<!-- Action: 单元/集成/E2E分层+覆盖率目标+重点 -->

### 单元: vitest | 目标≥n/a (测试类变更)
- 重点: 核心逻辑、边界条件、错误路径的测试覆盖

### 集成:
- 重点: 模块间契约验证、外部mock策略

### E2E: Playwright / Cypress
- 重点: 关键用户旅程、跨系统端到端验证

<!-- Validate: 三层全覆盖？覆盖率目标明确？ -->

## Step 1b: 5-Round Coverage Matrix
> **[ALL]** Goal: 五维度覆盖不遗漏 | Inputs: REQUIREMENT.md §4, §5, §9
<!-- Action: 功能/性能/安全/兼容/可观测 — 每轮标注执行状态和跳过理由 -->

| Round | 范围 | 状态 | 跳过理由 |
|-------|------|:--:|---------|
| Round 1: 功能正确性 | 九阶段全流程、阶段推进、profile 跳过 | passed | — |
| Round 2: 边界条件 | 重复完成、阶段顺序错误、workflow 已完成 | passed | — |
| Round 3: 错误处理 | artifact 缺失、错误阶段、admin 审批 | passed | — |
| Round 4: 集成 | WorkflowEngine + review-gate + artifact-validator | passed | — |
| Round 5: 端到端 | full-9-phase.test.ts 完整 init→integration 链路 | passed | — |

<!-- Validate: 每轮状态明确？跳过有理由？ -->

## Step 1c: Mocking Boundaries
> **[ALL]** Goal: 明确定义 mock 边界，防 mock 污染 | Inputs: DESIGN.md §5
<!-- Action: 每层标注 can_mock + 理由。外部 API / DB / 时间 / 文件系统可 mock；核心业务逻辑 / 验证 / 公开 API 契约禁止 mock -->

| 层级/模块 | Mock? | 理由 |
|----------|:-----:|------|
| filesystem | ❌ 禁止 | 需真实文件落盘验证 artifact |
| git | ✅ 允许 | 非测试目标 |

<!-- Validate: 外部依赖可 mock 但核心逻辑不许 mock？每个 mock 有理由？ -->

## Step 2: Test Cases
> **[ALL]** Goal: 每TC可独立执行 | Inputs: REQUIREMENT.md §3
<!-- Action: TC-XX [unit/integration/e2e] Given/When/Then -->

- **TC-01**: walks through all 9 phases in order `[passed]`
- **TC-02**: rejects duplicate completePhase after workflow completed `[passed]`
- **TC-03**: rejects wrong phase order `[passed]`
- **TC-04**: evaluateReviewLoopStatus passes with reviewScore >= threshold `[passed]`
- **TC-05**: completePhase blocks review when scores below threshold `[passed]`
- **TC-06**: completePhase passes review when scores meet threshold `[passed]`
- **TC-07**: blocks when artifact is missing `[passed]`
- **TC-08**: blocks when trying to complete wrong phase `[passed]`
- **TC-09**: blocks when workflow already completed `[passed]`
- **TC-10**: blocks admin as approver on human-gated phase `[passed]`
- **TC-11**: validates artifact file returns scores object `[passed]`

<!-- Validate: 每个TC有Given/When/Then？覆盖成功+失败？ -->

## Step 2b: AC to TC Traceability Matrix
> **[ALL]** Goal: 每个 AC 都有测试覆盖 | Inputs: REQUIREMENT.md Step 4
<!-- Action: 逐一对照 AC 编号，确保 test_plan 中有对应的测试用例 -->

| AC | 覆盖的测试用例 | 状态 |
|----|-------------|------|
| AC-01 | `TC-01` | ⚠ |
| AC-02 | `TC-01` | ⚠ |
| AC-03 | `TC-04`, `TC-05`, `TC-06` | ⚠ |
| AC-04 | `TC-01` | ⚠ |
| AC-05 | `TC-07`, `TC-08`, `TC-09` | ⚠ |

<!-- Validate: 每个 AC 至少 1 个 TC？遗漏的 AC 已标注？ -->

## Step 3: Code Path Coverage
> **[MEDIUM+]** Goal: 不漏测试 | Inputs: 实现代码diff
<!-- Action: ASCII树追踪每个函数/分支/错误路径的测试覆盖。★★★=边界+错误 ★★=happy ★=冒烟 -->

```
CODE PATH COVERAGE
===========================
[+] path/to/module.ts
    ├── fn()
    │   ├── [★★★ TESTED] desc — file:line
    │   └── [GAP]         desc — NO TEST

USER FLOW COVERAGE
===========================
[+] Feature flow
    ├── [★★★ TESTED] desc — file:line
    └── [GAP] [→E2E] desc — NO TEST

─────────────────────────────────
COVERAGE: N/M (X%) | QUALITY: ★★★:N ★★:N ★:N
GAPS: N (N need E2E, N eval)
```

<!-- Validate: 每个新增/修改函数都在图中？每条分支都有状态？ -->

## Step 4: Regression Rule
> **[ALL]** Goal: 回归必有测试 | Inputs: Step3
<!-- Action: IRON RULE + ECC red-green: 1)写测试→跑(过) 2)回退修复→跑(必须挂) 3)恢复修复→跑(过)。三步全绿才算验证完成 -->

| 回归项 | 原行为 | 新行为 | 测试 | Red-green | 状态 |
|--------|--------|--------|------|-----------|------|
| 九阶段全流程 | 无 E2E 覆盖 | full-9-phase.test.ts | tests/core/full-9-phase.test.ts | GREEN | passed |
| Review 评分门禁 | 无阈值测试 | >=9.5 通过/<9.5 拒绝 | tests/core/review-gate-scores.test.ts | GREEN | passed |
| Quality gate 拦截 | 无门禁测试 | artifact 缺失/错误阶段拦截 | tests/core/blocked-by-check.test.ts | GREEN | passed |

<!-- Validate: 所有修改的已有代码路径都有覆盖？Red-green三步都跑过了？ -->

## Step 5: Edge Case Coverage
> **[MEDIUM+]** Goal: 边界不遗漏 | Inputs: REQUIREMENT.md §7
<!-- Action: 并发/超时/非法输入/资源耗尽/空值 -->

| 场景 | TC | 状态 |
|------|-----|------|
| workflow 已完成时再次 completePhase | TC-02 | passed |
| 阶段顺序错误 | TC-03 | passed |
| admin 审批人被阻止 | TC-10 | passed |

<!-- Validate: 典型边界全覆盖？ -->

## Step 5b: UAT Scripts
> **[ALL]** Goal: 手动测试有脚本 | Inputs: REQUIREMENT.md §3
<!-- Action: 前置条件→步骤→期望→实际→执行人。集成阶段直接跑 -->


<!-- Validate: 覆盖所有需手动验证的 AC？ -->

## Step 6: Performance Tests
> **[MEDIUM+]** Goal: 性能有基线 | Inputs: REQUIREMENT.md §4
<!-- Action: 场景→目标→工具(k6/autocannon)→结果 -->

| 场景 | 目标 | 工具 | 结果 |
|------|------|------|------|
| 完整九阶段模拟 | < 30s | vitest | 2.6s |

<!-- Validate: 覆盖目标QPS？有基线对比？ -->

## Step 7: Security Tests
> **[HIGH]** Goal: 安全不出事 | Inputs: DESIGN.md §10
<!-- Action: OWASP Top10: SQL注入/XSS/CSRF/rate limit/敏感信息/npm audit -->

- [ ] npm audit 无 critical/high
- [ ] 无硬编码密钥
- [ ] 无 PII

<!-- Validate: OWASP Top10全覆盖？跑过npm audit/trivy？ -->

> 📎 **SSOT 规则**: 安全测试应 1:1 映射 [REQUIREMENT.md §Non-Functional Security](REQUIREMENT.md) 的 NFR-S* 和 [DESIGN.md §Security Model](DESIGN.md) 的威胁建模，不独立重评估。

## Step 7b: Compatibility Matrix
> **[MEDIUM+]** Goal: 多端不炸 | Inputs: 目标平台
<!-- Action: 浏览器+视口+数据迁移三种兼容验证 -->

### 浏览器
| 浏览器 | 版本 | 桌面 | 移动 | 状态 |
|--------|------|:--:|:--:|:--:|
| Chrome | 最新-1 | | | |
| Safari | 最新-1 | | | |
| Firefox | 最新-1 | | | |

### 视口
| 视口 | 状态 |
|------|:--:|
| Mobile (360) | |
| Tablet (768) | |
| Desktop (1440) | |

### 数据迁移（涉及 schema 变更必填）
- [ ] 生产数据快照预演通过
- [ ] 实测耗时: [N] 分钟
- [ ] 回滚脚本就位且测过

## Step 8: Regression Test Plan
> **[HIGH]** Goal: 新功能不影响已有 | Inputs: Step4
<!-- Action: 范围+用例数+执行方式+负责人 -->

| 回归范围 | 用例数 | 执行方式 | 负责人 |
|---------|--------|---------|--------|
| WorkflowEngine API | 3 files × 18 cases | vitest --run | CI |

<!-- Validate: 回归范围覆盖所有相关模块？ -->

## Summary
18 tests across 3 files, all passed. Complete nine-phase E2E coverage.

## Coverage
18/18 passed (100%)

---
## Quality Gate
<!-- Evidence-first: 所有测试用例必须实际跑过，不是"应该能过"。ECC: 没有新鲜输出=没有验证 -->

- [ ] S1 三层全覆盖
- [ ] S2 TC用Given/When/Then
- [ ] S2 覆盖成功+失败
- [ ] [ALL] S4 回归规则+Red-green已应用
- [ ] [M+] S3 Coverage图完整
- [ ] [M+] S5 边界全覆盖
- [ ] [M+] S6 性能有基线
- [ ] [H]  S7 OWASP全覆盖
- [ ] [H]  S8 回归范围完整
- [ ] CI可自动化
