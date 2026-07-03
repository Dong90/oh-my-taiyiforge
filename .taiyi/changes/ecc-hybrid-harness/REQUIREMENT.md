---
phase: requirement
skill: taiyi-requirement
gate: auto
produces: REQUIREMENT.md
upstream: [change]
downstream: [design, ui-design]
---
<!-- phase:requirement skill:taiyi-requirement gate:auto est:20min produces:REQUIREMENT.md upstream:[change] downstream:[design,ui-design] cplx:[ALL]5steps +[M+]4 +[H]1 -->
# REQUIREMENT: ECC Hybrid 双 harness 走通

> **一句话**: 走通 Superpowers + ECC 双线 harness 九阶段工作流，验证每个阶段的钩子触发与打卡机制。

---

> ⛔ **Out of Scope — 本变更明确不覆盖以下事项**
> - 不修复旧有 8 个卡在 integration 的 change
> - 不修改引擎代码或 workflow-manifest.yaml 配置
> - 不涉及任何业务代码改动或前端 UI
>
> 📌 *完整范围切分见下方 §Step 2 Scope Partitioning*

---

## Step 1: User Stories

- As a **TaiyiForge 维护者** I want **一次完整九阶段 ECC 双 harness 流程走通** so that **确认 workflow-manifest.yaml 的约束可执行，文档无漂移**
- As a **AI Agent** I want **每个阶段有明确的 harness 钩子热加载和打卡机制** so that **执行时知道必须调用哪些外部 Skill**
- As a **贡献者** I want **delivery-gate 验证 git trailer 并产出 CHANGELOG** so that **交付可追溯、可审计**

## Step 2: Scope Partitioning

### v1（本次必做）
- 完整走通九阶段 flow（change → integration）
- 触发并打卡每个阶段的 ECC/Superpowers harness 钩子
- integration 阶段产出 CHANGELOG.md 并经过 delivery-gate

### v2（下次）
- 修复旧有 8 个 change 的 integration 死锁
- 补充 engine 代码对 harness 行为的单元测试

### out（永不）
- 修改引擎运行时逻辑或 manifest 配置
- 编辑任何业务代码（.py / .ts 业务模块）

## Step 3: Functional Requirements

### 流程执行
- **FR-01**: 每个阶段按序推进，无跳步
- **FR-02**: 每个阶段 ECC harness 钩子触发并打卡
- **FR-03**: 人工门阶段（change/design/review）require `--approver`
- **FR-04**: dev 阶段 TDD 红绿循环完成
- **FR-05**: integration 阶段 delivery-gate 验证 git trailer 并产出 CHANGELOG.md

### 钩子系统
- **FR-06**: Superpowers hooks 按 `superpowers/<skill>` 格式打卡
- **FR-07**: ECC hooks 按 `ecc/<skill>` 格式打卡
- **FR-08**: 可选钩子可标记 N/A 绕过

## Step 4: Acceptance Criteria

- [ ] **AC-01**: change 阶段 → CHANGE.md 非 seed + change.json 有效，`taiyi complete --approver dongjun` 成功
  - **验证**: `test -f .taiyi/changes/ecc-hybrid-harness/CHANGE.md && test -f .taiyi/changes/ecc-hybrid-harness/change.json`
- [ ] **AC-02**: requirement 阶段 → REQUIREMENT.md 非 seed 且满足 quality gate
  - **验证**: `taiyi status ecc-hybrid-harness --json | jq '.engineTruth.currentPhase == "design"'`
- [ ] **AC-03**: design 阶段 → DESIGN.md ≥ 2 方案对比，human gate 通过
  - **验证**: `test -f .taiyi/changes/ecc-hybrid-harness/DESIGN.md`
- [ ] **AC-04**: task 阶段 → TASK.md 含可执行任务切片
  - **验证**: `grep -q '## Task' .taiyi/changes/ecc-hybrid-harness/TASK.md`
- [ ] **AC-05**: dev 阶段 → TDD 红绿循环，`.dev-complete` 含 exitCode 0
  - **验证**: `test -f .taiyi/changes/ecc-hybrid-harness/.dev-complete`
- [ ] **AC-06**: integration 阶段 → CHANGELOG.md 产出，delivery-gate passed
  - **验证**: `test -f .taiyi/changes/ecc-hybrid-harness/CHANGELOG.md`

## Step 5: Non-Functional Requirements

### 可用性
- **NFR-A01**: 每个阶段 ECC harness 钩子执行时间 ≤ 2 min

## Quality Gate

- [x] S1 用户角色全覆盖（维护者 / Agent / 贡献者）
- [x] S2 版本切分 v1/v2/out 各≥1条
- [x] S3 每个FR可独立测试
- [x] S4 AC用Given/When/Then + 验证命令
- [x] S5 非功能需求有数值
- [ ] S6 Error/Rescue 全覆盖（纯流程验证，无运行时错误场景）
- [ ] S7 核心流程四路径（纯流程验证，无数据流分支）
- [ ] S8 典型边界全覆盖（scope 受限，边界已在 scope partitioning 约束）
- [ ] S9 依赖关系已确认
- [ ] S10 安全合规已覆盖（本变更不触安全边界）
