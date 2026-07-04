---
phase: change
skill: taiyi-change
gate: human
produces: CHANGE.md
upstream: []
downstream: [requirement]
---
<!-- phase:change skill:taiyi-change gate:human est:15min produces:CHANGE.md upstream:[] downstream:[requirement] cplx:[ALL]5steps +[UI]1 +[M+]4 +[H]1 -->
# CHANGE: lang-test

> **一句话**: [变更目的和价值] | **Status**: active | **Slug**: lang-test

---

## Step 1: Problem Statement
> **[ALL]** Goal: 证明值得做 | Inputs: 用户反馈/监控/业务指标
<!-- Action: 用数据回答: 当前多痛、不改多惨、改了多好 -->

**当前状态**: [变更目的和价值]

**不改的代价**: [量化]

**目标状态**: [理想结果]

<!-- Validate: 有可度量数字？ -->

## Step 2: Boundary Definition
> **[ALL]** Goal: 画清边界防蔓延 | Inputs: Step1
<!-- Action: 列出要做的(动词开头)和明确不做的 -->

### In Scope

### Out of Scope
- _无_

<!-- Validate: In/Out互斥且穷尽？ -->

## Step 3: Visual Direction
> **[UI]** Goal: 前端项目预选视觉方向 | Inputs: 产品定位/品牌/竞品
<!-- Action: 前端项目必填，纯后端 skip。此选择被 Phase 4 ui-design 继承并深化 -->

- **调性**: _待选定_
- **理由**: _结合业务说明_
- **参考产品**: _3 个参考产品_
- **明确排除**: _无 — CLI/workflow only; no visual surface_

<!-- Validate: 调性选择有理由支撑？参考产品有可比性？ -->

## Step 4: Premise Challenge
> **[ALL]** Goal: 确认这是正确的问题 | Inputs: Step1+2
<!-- Action: 换角度重新审视 — 能不能不做/复用/更简单定义？有没有完全不同的路径？ -->

- **换个角度**: [重新定义问题会怎样？]
- **不做代价**: [量化]
- **已有复用**: [有无现成方案？]
- **Scrap it?**: [有没有完全不同的方案更值得做？gstack PD#9: 有更好的方法就说]

<!-- Validate: 挑战≥2个假设 + 至少考虑了一个替代路径 -->

## Step 5: Impact Map
> **[ALL]** Goal: 知道改了谁受影响 | Inputs: Step2
<!-- Action: 列出所有受影响的模块/服务/团队 -->

| 模块/服务/团队 | 影响 | 负责人 |
|--------------|------|--------|
| _本次变更仅影响测试套件_ | _无生产模块_ | _CI/CD_ |

<!-- Validate: 遗漏=上线事故 -->

## Step 6: Success Criteria
> **[ALL]** Goal: 定义"做完"的客观标准 | Inputs: Step1目标
<!-- Action: SC-XX编号，可度量可验证。完成后勾选 -->

- [ ] **SC-01**: 待填写

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
| _本次为测试/文档变更，无新增风险_ | _N/A_ | _N/A_ | _N/A_ |

<!-- Validate: 三类全覆盖？缓解可执行？ -->

## Step 9: Innovation Token Check
> **[MEDIUM+]** Goal: 不为新而新 | Inputs: Step7
<!-- Action: 新技术/新基础设施必须说明理由。每公司约3个token -->

| 技术决策 | Token? | 不选成熟方案的理由 |
|---------|:--:|-------------------|
| _本次无新技术引入_ | 否 | _沿用现有技术栈_ |

_已花费: 0/3_

<!-- Validate: ≤3？每个"是"有充分理由？ -->

## Step 10: Migration & Rollback
> **[HIGH]** Goal: 上线回退有预案 | Inputs: Step4+7
<!-- Action: 数据迁移/API变更/行为变更时描述切换和回退 -->

**迁移**: [步骤]
**回滚触发**: [量化条件]
**回滚操作**: [精确到命令]
**回滚时间**: ≤_N_min

<!-- Validate: 回滚≤30min？步骤精确？ -->

## Step 11: Stakeholder Sign-off
> **[MEDIUM+]** Goal: 该知道的人都知道了 | Inputs: Step4
<!-- Action: PM/TechLead/QA/安全/运维无遗漏 -->

| 角色 | 姓名 | 诉求 |
|------|------|------|
| _本次为测试变更，无额外干系人_ | _CI/CD_ | _自动化回归通过_ |

---
## Quality Gate
<!-- Evidence-first: 每项通过需要可验证证据，不是"感觉对了"。ECC verification-loop 取代 Superpowers verification-before-completion -->

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
