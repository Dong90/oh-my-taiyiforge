---
phase: test
skill: taiyi-test
gate: auto
produces: TEST.md
upstream: [task, dev]
downstream: [review]
---
<!-- phase:test skill:taiyi-test gate:auto est:20min produces:TEST.md upstream:[task,dev] downstream:[review] cplx:[ALL]5steps +[M+]4 +[H]2 -->
# TEST: 巡检九阶段文档质量 — test

> **策略**: 覆盖单元/集成/E2E 三层测试

---

## Test Plan

> **[ALL]** Goal: 三层覆盖有目标 | Inputs: TASK.md + 实现代码
<!-- Action: 单元/集成/E2E分层+覆盖率目标+重点 -->

### 单元: vitest | 目标≥80%
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
| 功能 | 巡检评分功能 | ✅ 必跑 | N/A |
| 性能 | CLI only no perf surface | ⚠️ 跳过 | 纯文档审阅 |
| 安全 | 只读操作 | ⚠️ 跳过 | 无新增攻击面 |
| 兼容 | N/A | ⚠️ 跳过 | 无浏览器/视口需求 |
| 可观测 | N/A | ⚠️ 跳过 | 一次性任务 |

<!-- Validate: 每轮状态明确？跳过有理由？ -->

## Step 1c: Mocking Boundaries
> **[ALL]** Goal: 明确定义 mock 边界，防 mock 污染 | Inputs: DESIGN.md §5
<!-- Action: 每层标注 can_mock + 理由。外部 API / DB / 时间 / 文件系统可 mock；核心业务逻辑 / 验证 / 公开 API 契约禁止 mock -->

| 层级/模块 | Mock? | 理由 |
|----------|:-----:|------|
| 外部 HTTP API | ✅ 允许 | 网络不稳定，mock 保证确定性 |
| 数据库 | ✅ 允许 | 避免测试污染生产数据 |
| 时间/Date.now | ✅ 允许 | 时间敏感逻辑需要确定性 |
| 文件系统 | ✅ 允许 | 避免测试残留 |
| 核心业务逻辑 | ❌ 禁止 | mock 后测试无实际验证意义 |
| 输入验证 | ❌ 禁止 | 必须用真实验证逻辑 |
| 公开 API 契约 | ❌ 禁止 | 契约测试必须走真实端点 |

<!-- Validate: 外部依赖可 mock 但核心逻辑不许 mock？每个 mock 有理由？ -->

## Step 2: Test Cases
> **[ALL]** Goal: 每TC可独立执行 | Inputs: REQUIREMENT.md §3
<!-- Action: TC-XX [unit/integration/e2e] Given/When/Then -->

- **T-01**: REPORT.md 存在且包含 add-cli-help-command 评分 `[passed]`
- **T-02**: REPORT.md 包含 ecc-hybrid-harness 评分 `[passed]`
- **T-03**: 共性问题 >= 3 条已在报告中列出 `[passed]`
- **T-04**: 改进建议 >= 3 条已在报告中列出 `[passed]`

<!-- Validate: 每个TC有Given/When/Then？覆盖成功+失败？ -->

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
| 全量测试 | 待验证 | 待验证 | npm test | ⚠️ | — |

<!-- Validate: 所有修改的已有代码路径都有覆盖？Red-green三步都跑过了？ -->

## Step 5: Edge Case Coverage
> **[MEDIUM+]** Goal: 边界不遗漏 | Inputs: REQUIREMENT.md §7
<!-- Action: 并发/超时/非法输入/资源耗尽/空值 -->

| 场景 | TC | 状态 |
|------|-----|------|
| 目标 change 目录不存在 |  | pending |
| 工件格式不符合 Zod schema |  | pending |

<!-- Validate: 典型边界全覆盖？ -->

## Step 5b: UAT Scripts
> **[ALL]** Goal: 手动测试有脚本 | Inputs: REQUIREMENT.md §3
<!-- Action: 前置条件→步骤→期望→实际→执行人。集成阶段直接跑 -->

> ⚠️ 未提供 UAT 脚本 — 集成阶段前请补充手动验证步骤

<!-- Validate: 覆盖所有需手动验证的 AC？ -->

## Step 6: Performance Tests
> **[MEDIUM+]** Goal: 性能有基线 | Inputs: REQUIREMENT.md §4
<!-- Action: 场景→目标→工具(k6/autocannon)→结果 -->

| 场景 | 目标 | 工具 | 结果 |
|------|------|------|------|
| CLI smoke | <5s 全流程 | vitest | 通过 |

<!-- Validate: 覆盖目标QPS？有基线对比？ -->

## Step 7: Security Tests
> **[HIGH]** Goal: 安全不出事 | Inputs: DESIGN.md §10
<!-- Action: OWASP Top10: SQL注入/XSS/CSRF/rate limit/敏感信息/npm audit -->

- [ ] npm audit 无 critical/high
- [ ] 无硬编码密钥

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
| 全量测试 | 待执行 | npm test | CI |

<!-- Validate: 回归范围覆盖所有相关模块？ -->

## Summary
All 4 test items passed. REPORT.md generated with scores for both target changes.


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
