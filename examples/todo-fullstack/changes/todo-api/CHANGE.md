---
phase: change
skill: taiyi-change
gate: human
produces: CHANGE.md
upstream: []
downstream: [requirement]
---
<!-- phase:change skill:taiyi-change gate:human est:15min produces:CHANGE.md upstream:[] downstream:[requirement] cplx:[ALL]5steps +[UI]1 +[M+]4 +[H]1 -->
# CHANGE: E2E Demo

> **一句话**: Validate TaiyiForge nine-phase workflow end-to-end in CI and dogfood runs. | **Status**: active | **Slug**: e2e-demo

---

## Step 1: Problem Statement
> **[ALL]** Goal: 证明值得做 | Inputs: 用户反馈/监控/业务指标
<!-- Action: 用数据回答: 当前多痛、不改多惨、改了多好 -->

**当前状态**: Validate TaiyiForge nine-phase workflow end-to-end in CI and dogfood runs.

**不改的代价**: 缺乏自动化回归，每次发版需人工走九阶段，耗时 30min+，容易漏步骤

**目标状态**: 一键 E2E 回归 < 60s，CI 自动通过全部九阶段门控

<!-- Validate: 有可度量数字？ -->

## Step 2: Boundary Definition
> **[ALL]** Goal: 画清边界防蔓延 | Inputs: Step1
<!-- Action: 列出要做的(动词开头)和明确不做的 -->

### In Scope
- workflow engine smoke test across all 9 phases
- artifact generation and validation for each phase
- gate verification (quality + human approval)
- verify-report generation and CI integration

### Out of Scope
- production feature changes
- browser E2E testing
- multi-tenant support

<!-- Validate: In/Out互斥且穷尽？ -->

## Step 3: Visual Direction
> **[UI]** Goal: 前端项目预选视觉方向 | Inputs: 产品定位/品牌/竞品
<!-- Action: 前端项目必填，纯后端 skip。此选择被 Phase 4 ui-design 继承并深化 -->

- **调性**: 简洁·技术风 - Minimalist dev-tool aesthetic
- **理由**: CLI 工具适合等宽字体+高对比度配色，兼顾终端可读性和 CI 日志友好
- **参考产品**: Vitest CLI · ESLint · Biome
- **明确排除**: 彩色图标、复杂仪表盘、非等宽字体

<!-- Validate: 调性选择有理由支撑？参考产品有可比性？ -->

## Step 4: Premise Challenge
> **[ALL]** Goal: 确认这是正确的问题 | Inputs: Step1+2
<!-- Action: 换角度重新审视 — 能不能不做/复用/更简单定义？有没有完全不同的路径？ -->

- **换个角度**: 不是'写个测试'，而是'让 CI 能自动验证整个研发流水线'
- **不做代价**: 缺乏自动化回归时：每次 30min 手工验证 × 每周 2 次发版 = 1h/周浪费
- **已有复用**: Vitest 已有 126 文件，仅需加 E2E 夹具即可复用
- **Scrap it?**: 不做 E2E，改用 Playwright 全真机测试 → 成本高 10x，CI 慢 3x，不符合当前阶段需求

<!-- Validate: 挑战≥2个假设 + 至少考虑了一个替代路径 -->

## Step 5: Impact Map
> **[ALL]** Goal: 知道改了谁受影响 | Inputs: Step2
<!-- Action: 列出所有受影响的模块/服务/团队 -->

| 模块/服务/团队 | 影响 | 负责人 |
|--------------|------|--------|
| CI/CD pipeline | 新测试用例加入回归矩阵 | CI/CD |
| Workflow Engine | 覆盖九个阶段的完整E2E路径 | Engine Team |
| examples/full-flow-demo | 作为可复现验证入口 | Docs Team |

<!-- Validate: 遗漏=上线事故 -->

## Step 6: Success Criteria
> **[ALL]** Goal: 定义"做完"的客观标准 | Inputs: Step1目标
<!-- Action: SC-XX编号，可度量可验证。完成后勾选 -->

- [x] **SC-01**: All nine phases complete with gates passing
- [x] **SC-02**: Fresh .taiyi/changes/ artifact dir contains 11/11 files
- [x] **SC-03**: verify-report.json ok:true with zero errors

<!-- Validate: 每条可客观度量(数字/百分比/布尔)？ -->

## Step 7: Dream State
> **[MEDIUM+]** Goal: 确认在正确方向 | Inputs: Step1+5
<!-- Action: 画现在→本次→12月后轨迹 -->

```
  CURRENT              THIS CHANGE              12-MONTH IDEAL
  _现状_     --->      _本次增量_    --->        _理想终态_
```

<!-- Validate: 向理想靠近而非引入未来技术债？ -->

## Step 8: Risk Assessment
> **[MEDIUM+]** Goal: 识别可能出错的地方 | Inputs: Step4
<!-- Action: 技术/业务/时间风险+概率+影响+缓解 -->

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| E2E 测试假阳性 | 中 | 误拦发布 | CI 重试 + 人工确认 |
| 测试超时 | 低 | CI 队列堵塞 | 各阶段独立超时预算 |
| 模板与实际工件漂移 | 低 | E2E 失效 | 共享 E2E_ARTIFACTS 夹具保证同源 |

<!-- Validate: 三类全覆盖？缓解可执行？ -->

## Step 9: Innovation Token Check
> **[MEDIUM+]** Goal: 不为新而新 | Inputs: Step7
<!-- Action: 新技术/新基础设施必须说明理由。每公司约3个token -->

| 技术决策 | Token? | 不选成熟方案的理由 |
|---------|:--:|-------------------|
| Vitest 全量回归 | 否 | 已有技术栈，无新引入 |
| Handlebars 模板引擎 | 否 | 团队已在使用，非新技术 |

_已花费: 2/3_

<!-- Validate: ≤3？每个"是"有充分理由？ -->

## Step 10: Migration & Rollback
> **[HIGH]** Goal: 上线回退有预案 | Inputs: Step4+7
<!-- Action: 数据迁移/API变更/行为变更时描述切换和回退 -->

**迁移**: npm install (无额外步骤) — 测试代码纯增量，无数据迁移
**回滚触发**: E2E 测试持续失败 (>2 次重试)
**回滚操作**: git revert <commit>
**回滚时间**: ≤5min

<!-- Validate: 回滚≤30min？步骤精确？ -->

## Step 11: Stakeholder Sign-off
> **[MEDIUM+]** Goal: 该知道的人都知道了 | Inputs: Step4
<!-- Action: PM/TechLead/QA/安全/运维无遗漏 -->

| 角色 | 姓名 | 诉求 |
|------|------|------|
| Engine Team | CI/CD | 自动化回归通过即可合并 |
| QA | N/A | E2E 测试覆盖 smog check |
| Maintainer | OpenSource | 示例工程可复现，降低贡献门槛 |

---
## Quality Gate
<!-- Evidence-first: 每项通过需要可验证证据，不是"感觉对了"。Superpowers verification-before-completion -->

⬜ S1 有量化数据
⬜ S2 边界清晰
⬜ [UI] S3 视觉调性已选定
⬜ S4 挑战≥2假设 + 有Scrap-it备选
⬜ S5 影响模块无遗漏
⬜ S6 每条SC可度量
⬜ [M+] S7 向理想靠近
⬜ [M+] S8 三类风险全覆盖
⬜ [M+] S9 Token≤3
⬜ [H]  S10 回滚方案可执行
⬜ [M+] S11 干系人无遗漏
⬜ **TODOS.md**: 延期项已记录 | gstack PD#7: 没写=不存在
