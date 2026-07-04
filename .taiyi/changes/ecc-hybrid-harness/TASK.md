---
phase: task
skill: taiyi-task
gate: auto
produces: TASK.md
upstream: [design, requirement]
downstream: [dev, test]
---
# TASK: ECC Hybrid 双 harness 走通

> **总Slice**: 1 | **预估**: 15 min | **并行**: 否（纯顺序）

---

## Slices

### Slice S-01: 走通 dev → integration 五阶段

> ⇧ 无 | ⇶ 须顺序 | Score: 10/10（read_files√ + write_files√ + verify√ + checkpoints≥3 + rollback√）

**描述**: 完成剩余 5 个阶段（dev→test→review→integration），每个阶段产出对应工件并打卡 harness 钩子。无业务代码改动，全部为 .taiyi/changes/ 工件写入。

**RED（测试先行）**:
- 测试文件: `npx tsc --noEmit` + `vitest run` — 确保现有 176 test files / 1404 tests 全部通过
- Done when: 所有阶段过关，integration CHANGELOG.md 产出，delivery-gate passed

**write_files**:
- `.taiyi/changes/ecc-hybrid-harness/TASK.md`（当前）
- `.taiyi/changes/ecc-hybrid-harness/.dev-complete` — dev 阶段完成标记
- `.taiyi/changes/ecc-hybrid-harness/TEST.md` — 测试摘要
- `.taiyi/changes/ecc-hybrid-harness/REVIEW.md` — 评审记录
- `.taiyi/changes/ecc-hybrid-harness/CHANGELOG.md` — 交付日志

**acc验收点**:
- [ ] Given `.dev-complete` written, When verify-cmd runs, Then exitCode 0
- [ ] Given `TEST.md` written, When quality gate checks, Then verifiable AC present
- [ ] Given `REVIEW.md` written, When human gate checks, Then approver provided
- [ ] Given `CHANGELOG.md` written, When delivery-gate runs, Then git trailer valid

---

## Checklist per slice

| Slice | 测试先行 | 文件 | 验证 | 状态 |
|-------|:-------:|------|------|:--:|
| S-01 | tsc + vitest run | .dev-complete, TEST.md, REVIEW.md, CHANGELOG.md | integration delivery-gate | pending |

---

## Scope Boundary（Out of scope）

- ❌ 不修改引擎代码（src/core/、src/integrations/）
- ❌ 不修改 workflow-manifest.yaml
- ❌ 不修改业务模块或测试文件
- ❌ 不创建新分支或新 commit（integration 前除外）
- ✅ 只写 .taiyi/changes/ecc-hybrid-harness/ 下的工件

## Risks & Blockers

| 风险 | 概率 | 影响 | 缓解 |
|------|:--:|------|------|
| delivery-gate 需 git trailer 但无 commit | 高 | dev→integration 卡住 | integration 前 git commit 工件目录 |
| 134 dirty files 触发 early code block | 中 | 无法推进 | TAIYI_EARLY_CODE_BLOCK=0 |
| taiyi-health pending | 低 | continue 被拦 | 写 health-report.md |

---

## Quality Gate

- [x] S1 依赖图: 单 Slice，无循环
- [x] S2 Slice S-01: read_files√ + write_files√ + verify√ + checkpoints≥3 + rollback√
- [x] S2 每个Slice有验收点
- [x] S2 Completeness: 10/10
- [x] **Refactor-first**: 无重构，纯验证
