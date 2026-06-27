---
phase: test
skill: taiyi-test
gate: auto
produces: TEST.md
upstream: [task, dev]
downstream: [review]
---
<!-- phase:test skill:taiyi-test gate:auto est:20min produces:TEST.md upstream:[task,dev] downstream:[review] cplx:[ALL]5steps +[M+]4 +[H]2 -->
# TEST: E2E Demo

> **策略**: 覆盖单元/集成/E2E 三层测试

---

## Step 1: Test Strategy
> **[ALL]** Goal: 三层覆盖有目标 | Inputs: TASK.md + 实现代码
<!-- Action: 单元/集成/E2E分层+覆盖率目标+重点 -->

### 单元: vitest | 目标≥85%
- 重点: _核心逻辑、边界条件、错误路径的测试覆盖_

### 集成:
- 重点: _模块间契约验证、外部mock策略_

### E2E: [Playwright/Cypress]
- 重点: _关键用户旅程、跨系统端到端验证_

<!-- Validate: 三层全覆盖？覆盖率目标明确？ -->

## Step 1b: 5-Round Coverage Matrix
> **[ALL]** Goal: 五维度覆盖不遗漏 | Inputs: REQUIREMENT.md §4, §5, §9
<!-- Action: 功能/性能/安全/兼容/可观测 — 每轮标注执行状态和跳过理由 -->

| Round | 范围 | 状态 | 跳过理由 |
|-------|------|:--:|---------|
| Round 1 · 功能 | 全部 AC | ✅ 必跑 | — |
| Round 2 · 性能 | Lighthouse / k6 / bundle | ⚠️ / ❌ | _如果跳过，请在此说明理由_ |
| Round 3 · 安全 | 依赖审计 / SAST / OWASP | ⚠️ / ❌ | _如果跳过，请在此说明理由_ |
| Round 4 · 兼容 | 浏览器 / 视口 / 数据迁移 | ⚠️ / ❌ | _如果跳过，请在此说明理由_ |
| Round 5 · 可观测 | 日志 / 指标 / 告警 | ⚠️ / ❌ | _如果跳过，请在此说明理由_ |

<!-- Validate: 每轮状态明确？跳过有理由？ -->

## Step 1c: Mocking Boundaries
> **[ALL]** Goal: 明确定义 mock 边界，防 mock 污染 | Inputs: DESIGN.md §5
<!-- Action: 每层标注 can_mock + 理由。外部 API / DB / 时间 / 文件系统可 mock；核心业务逻辑 / 验证 / 公开 API 契约禁止 mock -->

| 层级/模块 | Mock? | 理由 |
|----------|:-----:|------|
| _外部 HTTP API_ | ✅ 允许 | _网络不稳定，mock 保证确定性_ |
| _数据库_ | ✅ 允许 | _避免测试污染生产数据_ |
| _时间/Date.now_ | ✅ 允许 | _时间敏感逻辑需要确定性_ |
| _文件系统_ | ✅ 允许 | _避免测试残留_ |
| _核心业务逻辑_ | ❌ 禁止 | _mock 后测试无实际验证意义_ |
| _输入验证_ | ❌ 禁止 | _必须用真实验证逻辑_ |
| _公开 API 契约_ | ❌ 禁止 | _契约测试必须走真实端点_ |

<!-- Validate: 外部依赖可 mock 但核心逻辑不许 mock？每个 mock 有理由？ -->

## Step 2: Test Cases
> **[ALL]** Goal: 每TC可独立执行 | Inputs: REQUIREMENT.md §3
<!-- Action: TC-XX [unit/integration/e2e] Given/When/Then -->

- **T-01**: workflow smoke — 9 phases complete `[passed]`
- **T-02**: assertExpectedArtifacts — missing file detection `[passed]`
- **T-03**: template fallback — no .hbs returns hardcoded md `[passed]`

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
<!-- Action: gstack IRON RULE + Superpowers red-green: 1)写测试→跑(过) 2)回退修复→跑(必须挂) 3)恢复修复→跑(过)。三步全绿才算验证完成 -->

| 回归项 | 原行为 | 新行为 | 测试 | Red-green | 状态 |
|--------|--------|--------|------|-----------|------|
| 全量 vitest | 126 pass | 126 pass | npm test | ✅ | ✅ |
| template rendering | N/A | data-rich fixtures | npm test | ✅ | ✅ |

<!-- Validate: 所有修改的已有代码路径都有覆盖？Red-green三步都跑过了？ -->

## Step 5: Edge Case Coverage
> **[MEDIUM+]** Goal: 边界不遗漏 | Inputs: REQUIREMENT.md §7
<!-- Action: 并发/超时/非法输入/资源耗尽/空值 -->

| 场景 | TC | 状态 |
|------|-----|------|
| 并发执行多个 taiyi CLI | TC-E01 | ⚠ N/A |
| 空模板目录 | TC-E02 | ✅ fallback to hardcoded md |
| profile=api 跳过 ui-design | TC-E03 | ✅ expected artifacts reduced |
| 无效 change slug (含空格) | TC-E04 | ✅ CLI 报错退出 |

<!-- Validate: 典型边界全覆盖？ -->

## Step 5b: UAT Scripts
> **[ALL]** Goal: 手动测试有脚本 | Inputs: REQUIREMENT.md §3
<!-- Action: 前置条件→步骤→期望→实际→执行人。集成阶段直接跑 -->

### UAT-1 · _场景名_
- **前置**: 
- **步骤**: 1.  2.  3. 
- **期望**: -  - 
- **实际**: 通过 / 失败 / [描述]
- **执行人 / 时间**:

<!-- Validate: 覆盖所有需手动验证的 AC？ -->

## Step 6: Performance Tests
> **[MEDIUM+]** Goal: 性能有基线 | Inputs: REQUIREMENT.md §4
<!-- Action: 场景→目标→工具(k6/autocannon)→结果 -->

| 场景 | 目标 | 工具 | 结果 |
|------|------|------|------|
| 全量 e2e-workflow | < 60s 总耗时 | vitest | ✅ ~35s |
| 单阶段 artifact write | < 500ms | vitest benchmark | ✅ ~80ms |

<!-- Validate: 覆盖目标QPS？有基线对比？ -->

## Step 7: Security Tests
> **[HIGH]** Goal: 安全不出事 | Inputs: DESIGN.md §10
<!-- Action: OWASP Top10: SQL注入/XSS/CSRF/rate limit/敏感信息/npm audit -->

- [ ] npm audit 无 critical/high
- [ ] 无硬编码密钥/令牌

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
| 全量 vitest | 780+ | npm test | CI |
| E2E workflow | 1 suite | npm test -- tests/e2e-workflow.test.ts | CI |

<!-- Validate: 回归范围覆盖所有相关模块？ -->

## Summary
All required test suites pass. No flaky tests introduced. E2E fixture content enriched to demonstrate production-quality artifact depth.

## Coverage
126 test files, 780+ tests across unit/integration/E2E. New E2E smoke covers all 9 phases with gate verification.

---
## Quality Gate
<!-- Evidence-first: 所有测试用例必须实际跑过，不是"应该能过"。Superpowers: 没有新鲜输出=没有验证 -->

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
