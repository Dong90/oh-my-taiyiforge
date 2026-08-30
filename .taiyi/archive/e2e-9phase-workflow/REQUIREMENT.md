---
phase: requirement
skill: taiyi-requirement
gate: auto
produces: REQUIREMENT.md
upstream: [change]
downstream: [design, ui-design]
---
<!-- phase:requirement skill:taiyi-requirement gate:auto est:20min produces:REQUIREMENT.md upstream:[change] downstream:[design,ui-design] cplx:[ALL]5steps +[M+]4 +[H]1 -->
# REQUIREMENT: E2E 九阶段全流程集成测试

> **一句话**: 开发者与 CI 系统需要可重复的九阶段全流程验证，确保引擎变更不破坏核心流水线

---

> ⛔ **Out of Scope — 本变更明确不覆盖以下事项**
> <!-- 放置在最顶部，让读者第一眼知道什么不做。与 Step 2 的 scope_out 内容一致无需重复详述，此处为硬性提醒 -->
> - UI 交互界面的测试
> - 多 change 间的并行/冲突场景
> - taiyi CLI 的终端用户交互
> - 外部工具集成（OpenSpec、GStack 等）
>
> 📌 *完整范围切分见下方 §Step 2 Scope Partitioning*

---

## Step 1: User Stories
> **[ALL]** Goal: 从用户视角说清需求 | Inputs: CHANGE.md §1, §2
<!-- Action: As a [角色] I want [功能] so that [价值]. 覆盖所有角色 -->

- **As a** 开发者, **I want** 运行一条完整的九阶段流水线（init → change → requirement → design → ui-design → task → dev → test → review → integration）并能观测每阶段的 artifact 生成与通过, **so that** 我在修改引擎核心代码后能快速验证没有破坏整条流程 (P0) [v1]
- **As a** CI 系统, **I want** 在每个阶段完成后自动校验 currentPhase 推进到下一阶段, **so that** 阶段状态机的正确性有据可查，回归问题在 PR 阶段就被捕获 (P0) [v1]
- **As a** 开发者, **I want** review 阶段能按四维评分（completeness、consistency、verifiability、traceability）正确通过或拒绝, **so that** 低质量变更在合并前被拦截，评审标准可量化 (P1) [v1]
- **As a** 开发者, **I want** 使用 lite profile 时自动跳过 design 和 ui-design 阶段, **so that** 轻量变更无需经过不必要的阶段 (P1) [v1]
- **As a** 开发者, **I want** 在 quality gate 不通过时 continue 被拒绝并给出提示, **so that** 不满足质量门禁的变更无法被错误地推进 (P2) [v1]

<!-- Validate: 所有用户角色都覆盖了？ -->

## Step 2: Scope Partitioning
> **[ALL]** Goal: 分版本切范围，防 TASK 阶段误判 | Inputs: CHANGE.md §2
<!-- Action: v1=本次必做, v2=下次, out=永不. 至少 v2+out 各 ≥1 条 -->

### v1（本次必做）

### v2（下次）

### out（永不）
- UI 交互界面的测试
- 多 change 间的并行/冲突场景
- taiyi CLI 的终端用户交互
- 外部工具集成（OpenSpec、GStack 等）

<!-- Validate: v2 和 out 各 ≥ 1 条？v1 不包含 out 项？ -->

## Step 3: Functional Requirements
> **[ALL]** Goal: 拆成可测试的功能点 | Inputs: Step1
<!-- Action: FR-XX编号，分模块。涉及UI标注(UI)→触发Phase4 -->

### 状态机推进
- **FR-01**: completePhase() 在 quality gate 通过后推进 currentPhase 到下一阶段
- **FR-02**: getState() 返回的 currentPhase 能被外部读取以确认推进结果
### 质量门禁
- **FR-03**: artifact-validator 对每阶段的 .json 做 Zod schema 校验，必填字段缺失时返回 quality 失败
- **FR-04**: review 阶段校验四维评分（completeness/consistency/verifiability/traceability），全部 ≥9.5 方可通过
### Profile 跳过
- **FR-05**: non-full profile（lite/micro/nano）在 completePhase 中跳过对应阶段

<!-- Validate: 每个FR可独立测试？编号连续？ -->

## Step 4: Acceptance Criteria
> **[ALL]** Goal: 每个FR都有客观验收标准 | Inputs: Step3
<!-- Action: Given/When/Then，AC-XX对应FR-XX。verify=可执行验证命令 -->

- [ ] **AC-01**: 九阶段全流程模拟：mock 的 .taiyi/changes/{slug}/ 目录走通所有阶段后，每个阶段的 artifact 文件（.json + .md）存在且 JSON Schema 校验通过
  - **验证**: `vitest run tests/core/full-9-phase.test.ts`
- [ ] **AC-02**: 阶段推进正确性：每个阶段执行 complete 后，调用 engine.getState(slug) 的 currentPhase 字段值为下一阶段 ID
  - **验证**: `vitest run tests/core/full-9-phase.test.ts -t 'phase transition'`
- [ ] **AC-03**: review 评分门禁：四维评分均为 ≥9.5 时 complete 通过；任一维度 <9.5 时 complete 被拒绝返回 error
  - **验证**: `vitest run tests/core/review-gate-scores.test.ts`
- [ ] **AC-04**: lite profile 跳过行为：init 时 profile=lite 的 change，complete 推进时自动跳过 design 和 ui-design 阶段，currentPhase 从 requirement 直接到 task
  - **验证**: `vitest run tests/core/full-9-phase.test.ts -t 'lite profile'`
- [ ] **AC-05**: quality gate 拦截：artifact 缺少必填字段时（如 change.json 无 motivation），continue 返回 error 且 currentPhase 不变
  - **验证**: `vitest run tests/core/blocked-by-check.test.ts`

<!-- Validate: 每个AC可独立验收？Given/When/Then完整？验证命令可执行？ -->

## Step 5: Non-Functional Requirements
> **[ALL]** Goal: 性能/安全/可用性有硬指标 | Inputs: Step2
<!-- Action: NFR-XX编号，每个带数值 -->

  ### 性能
  - **NFR-P01**: 完整九阶段模拟测试执行时间 < 30s
  
  

<!-- Validate: 每个指标有具体数字？ -->

> 📎 **SSOT 规则**: NFR-S* 安全要求应基于 [CHANGE.md §Risks](CHANGE.md) 做非功能性拆解，不独立重评估。每条 NFR-S 应与 CHANGE 的 risks[] 可追溯。

## Step 6: Error & Rescue Map
> **[MEDIUM+]** Goal: 每个错误都有名字和恢复路径 | Inputs: Step2+3
<!-- Action: 触发条件→捕获位置→用户看到→恢复路径 -->

| 错误类型 | 触发 | 捕获 | 用户看到 | 恢复 |
|---------|------|------|---------|------|
| artifact JSON Schema 校验失败 | 必填字段缺失 / 类型不符时 | completePhase 捕获校验异常并合并到 qualityHints 数组 | continue 返回 error 信息 + 质量门禁提示 | 修改对应 .json 文件补全字段后重试 continue |
| review 评分不达标 | 四维评分任一 < 9.5 | review-gate 返回 Block 并附具体低分维度 | REVIEW.md 标注低分项 + continue 拒绝提示 | 修改 review.json scores 或补充证据后重试 continue |
| profile 阶段不匹配 | 对 lite profile 调用 design 阶段 complete | 跳过逻辑拦截：profile 不含该阶段时 early return | continue 自动前进到下一有效阶段，无 error | 无需恢复，此为正常行为 |

<!-- Validate: 所有可能的错误都有名字？恢复路径可执行？ -->


## Step 8: Non-Happy-Path Matrix
> **[MEDIUM+]** Goal: 边界和异常不遗漏 | Inputs: Step5+6
<!-- Action: 空值/超时/并发/权限/非法输入全覆盖 -->

| 场景 | 预期行为 |
|------|---------|
| change.json 缺少 motivation 字段时 continue | continue 返回 error，currentPhase 保持在 change，qualityHints 包含 motivation 缺失提示 |
| review.json 缺少 score 字段时 continue | continue 被拒绝，四维评分默认降为 0，无法通过 ≥9.5 门禁 |
| init 后未写任何 artifact 就尝试 continue | completePhase 因 artifact 不存在而返回 error，currentPhase 不变 |

<!-- Validate: 典型边界(空/超/并发/权限)全覆盖？ -->

## Step 9: Dependencies
> **[MEDIUM+]** Goal: 外部依赖不阻塞 | Inputs: CHANGE.md §4
<!-- Action: 技术约束/第三方/跨团队+状态+风险 -->

| 依赖 | 类型 | 状态 | 风险 |
|------|------|------|------|
| vitest | devDependency | 已安装 | 无 |
| src/core/workflow-engine.ts | internal | 已存在 | API 变动需同步测试 |
| src/core/artifact-validator.ts | internal | 已存在 | 校验逻辑变动需同步测试 |
| src/schemas/*.ts | internal | 已存在 | Zod schema 变动需同步测试 fixture |

<!-- Validate: 第三方SLA确认？跨团队排期对齐？ -->

## Step 10: Security & Compliance
> **[HIGH]** Goal: 安全不出事 | Inputs: Step4+5
<!-- Action: OWASP Top10 + GDPR/PIPL. user/auth/payment/PII场景必填 -->

- [ ] npm audit 无 critical/high
- [ ] 无硬编码密钥/令牌
- [ ] PII/GDPR 合规检查（若涉及用户数据）

<!-- Validate: threat modeling过了？PII合规？ -->

---
## Quality Gate
<!-- Evidence-first: 每个需求可追溯到CHANGE.md的SC，ECC 替代 Superpowers 需求逐条对账 -->

- [ ] S1 用户角色全覆盖
- [ ] S2 版本切分 v1/v2/out 各≥1条
- [ ] S3 每个FR可独立测试
- [ ] S4 AC用Given/When/Then + 验证命令
- [ ] S5 非功能需求有数值
- [ ] [M+] S6 Error/Rescue全覆盖 | PD#2
- [ ] [M+] S8 典型边界全覆盖
- [ ] [M+] S9 依赖关系已确认
- [ ] [H]  S10 安全合规已覆盖
- [ ] 无[NEEDS CLARIFICATION]残留
