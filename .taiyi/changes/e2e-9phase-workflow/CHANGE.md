---
phase: change
skill: taiyi-change
gate: human
produces: CHANGE.md
upstream: []
downstream: [requirement]
---
<!-- phase:change skill:taiyi-change gate:human est:15min produces:CHANGE.md upstream:[] downstream:[requirement] cplx:[ALL]5steps +[UI]1 +[M+]4 +[H]1 -->
# CHANGE: E2E 集成测试：九阶段全流程

> **一句话**: 当前 taiyi-forge 引擎缺少覆盖九阶段全流程的集成测试。单测覆盖了各模块的独立逻辑，但无人验证 init → change → requirement → design → ui-design → task → dev → test → review → integration 整条流水线的正确性。每次改核心引擎代码（workflow-engine.ts、artifact-validator.ts、phase-registry.ts 等）只能靠手动点检，回归风险高。E2E 测试能让引擎的每次变更都有可重复的验证手段，释放手动 QA 的 30+ 分钟/次。 | **Status**: active | **Slug**: e2e-9phase-workflow

---

## Step 1: Problem Statement
> **[ALL]** Goal: 证明值得做 | Inputs: 用户反馈/监控/业务指标
<!-- Action: 用数据回答: 当前多痛、不改多惨、改了多好 -->

**当前状态**: 当前 taiyi-forge 引擎缺少覆盖九阶段全流程的集成测试。单测覆盖了各模块的独立逻辑，但无人验证 init → change → requirement → design → ui-design → task → dev → test → review → integration 整条流水线的正确性。每次改核心引擎代码（workflow-engine.ts、artifact-validator.ts、phase-registry.ts 等）只能靠手动点检，回归风险高。E2E 测试能让引擎的每次变更都有可重复的验证手段，释放手动 QA 的 30+ 分钟/次。

**不改的代价**: > 💡 如果不改会怎样? 例: "继续流失用户，Q3 预测 NPS 下降 5 点"

**目标状态**: > 💡 改完之后目标状态是什么? 例: "登录态保持 7 天，超时后刷新 Token 无需重新登录"

<!-- Validate: 有可度量数字？ -->

## Step 2: Boundary Definition
> **[ALL]** Goal: 画清边界防蔓延 | Inputs: Step1
<!-- Action: 列出要做的(动词开头)和明确不做的 -->

### In Scope
- 编写一个端到端测试，模拟完整九阶段流程：init → change → requirement → design → ui-design → task → dev → test → review → integration
- 每阶段验证 artifact（.json + .md）的正确生成与字段完整性
- 每阶段验证 quality gate 的触发与通过
- 测试 continue 推进逻辑 — complete 后 currentPhase 正确推进到下一阶段
- 验证 review 阶段的评分机制（四维 ≥9.5）与 review-loop 重试逻辑
- 验证 skip profile（lite/micro/nano）的跳过行为
- 验证失败场景：gate 不通过时 continue 被拒绝
- 使用 vitest 作为测试框架，测试文件放在 tests/e2e/ 目录下

### Out of Scope
- 不测试 UI 交互界面
- 不测试多 change 间的并行/冲突场景
- 不测试 taiyi CLI 的终端用户交互
- 不测试外部工具集成（OpenSpec、GStack 等）

<!-- Validate: In/Out互斥且穷尽？ -->

## Step 3: Visual Direction
> **[UI]** Goal: 前端项目预选视觉方向 | Inputs: 产品定位/品牌/竞品
<!-- Action: 前端项目必填，纯后端 skip。此选择被 Phase 4 ui-design 继承并深化 -->

- **调性**: 
- **理由**: 
- **参考产品**: 
- **明确排除**: 无 — CLI/workflow only; no visual surface

<!-- Validate: 调性选择有理由支撑？参考产品有可比性？ -->

## Step 4: Premise Challenge
> **[ALL]** Goal: 确认这是正确的问题 | Inputs: Step1+2
<!-- Action: 换角度重新审视 — 能不能不做/复用/更简单定义？有没有完全不同的路径？ -->

- **换个角度**: 
- **不做代价**: 
- **已有复用**: 
- **Scrap it?**: 

<!-- Validate: 挑战≥2个假设 + 至少考虑了一个替代路径 -->

## Step 5: Impact Map
> **[ALL]** Goal: 知道改了谁受影响 | Inputs: Step2
<!-- Action: 列出所有受影响的模块/服务/团队 -->

| 模块/服务/团队 | 影响 | 负责人 |
|--------------|------|--------|
| tests/e2e | 新增 E2E 测试目录和测试文件 | self |

> ⚠️ 如未列出 impact_map，Zod 校验会要求 ≥ 1 条；占位 fallback 已删除。

<!-- Validate: 遗漏=上线事故 -->

## Step 6: Success Criteria
> **[ALL]** Goal: 定义"做完"的客观标准 | Inputs: Step1目标
<!-- Action: SC-XX编号，可度量可验证。完成后勾选 -->

- [x] **SC-01**: 创建 mock 的 .taiyi/changes/{slug}/ 目录结构，九阶段全流程走通后所有 artifact 文件存在且 JSON Schema 校验通过
- [x] **SC-02**: 每个阶段 complete 后 status 的 currentPhase 正确推进到下一阶段
- [x] **SC-03**: review 阶段评分 ≥9.5 时通过，<9.5 时被拒绝
- [x] **SC-04**: lite profile 可跳过 design 和 ui-design 阶段

<!-- Validate: 每条可客观度量(数字/百分比/布尔)？ -->

## Step 7: Dream State
> **[MEDIUM+]** Goal: 确认在正确方向 | Inputs: Step1+5
<!-- Action: 画现在→本次→12月后轨迹 -->

```
  CURRENT              THIS CHANGE              12-MONTH IDEAL
       --->          --->        
```

<!-- Validate: 向理想靠近而非引入未来技术债？ -->

## Step 8: Risk Assessment
> **[MEDIUM+]** Goal: 识别可能出错的地方 | Inputs: Step4
<!-- Action: 技术/业务/时间风险+概率+影响+缓解 -->

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 引擎内部 API 变动 | 高 | E2E 测试与引擎核心 API 紧密耦合，API 重构时需要同步更新测试 | 测试采用引擎暴露的公共 API（workflow-engine、state-sync），而非内部细节；API 变动时测试编译失败可立即感知 |
| 测试执行时间过长 | 中 | 完整九阶段模拟可能耗时数秒以上，CI 流水线变慢 | 使用轻量 mock 避免真实文件 I/O 和外部进程调用；可加 test.skip 标记作为可选运行 |

<!-- Validate: 三类全覆盖？缓解可执行？ -->

## Step 9: Innovation Token Check
> **[MEDIUM+]** Goal: 不为新而新 | Inputs: Step7
<!-- Action: 新技术/新基础设施必须说明理由。每公司约3个token -->

| 技术决策 | Token? | 不选成熟方案的理由 |
|---------|:--:|-------------------|
| 本次无新技术引入 | 否 | 沿用现有技术栈 |

**已花费: 0/3**

<!-- Validate: ≤3？每个"是"有充分理由？ -->

## Step 10: Migration & Rollback
> **[HIGH]** Goal: 上线回退有预案 | Inputs: Step4+7
<!-- Action: 数据迁移/API变更/行为变更时描述切换和回退 -->

**迁移**: 
**回滚触发**: 
**回滚操作**: 
**回滚时间**: 

<!-- Validate: 回滚≤30min？步骤精确？ -->

## Step 11: Stakeholder Sign-off
> **[MEDIUM+]** Goal: 该知道的人都知道了 | Inputs: Step4
<!-- Action: PM/TechLead/QA/安全/运维无遗漏 -->

| 角色 | 姓名 | 诉求 |
|------|------|------|
| 本次为测试变更，无额外干系人 | CI/CD | 自动化回归通过 |

---
## Quality Gate
<!-- Evidence-first: 每项通过需要可验证证据，不是"感觉对了"。ECC verification-loop 取代 Superpowers verification-before-completion -->

⬜ S1 有量化数据
⬜ S2 边界清晰
⬜ [UI] S3 视觉调性已选定
⬜ S4 挑战≥2假设 + 有Scrap-it备选
⬜ S5 影响模块无遗漏
⬜ S6 每条SC可度量
⬜ [M+] S8 三类风险全覆盖
⬜ [H]  S10 回滚方案可执行
⬜ **TODOS.md**: 延期项已记录 | PD#7: 没写=不存在
