<!-- 项目级上下文 · 来自 taiyi-intel-scan · 引擎自动维护 -->
## Project Context

# CONTEXT: ecc-hybrid-harness

> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要

完整走通 ECC 双 harness flow 验证，无业务代码改动。

## 相关目录

| 路径 | 关系 | 备注 |
|------|------|------|
| `.taiyi/changes/ecc-hybrid-harness/` | 必读 | 本变更工件目录 |
| `docs/taiyi/workflow-manifest.yaml` | 必读 | 双 harness 真源，285 行 |
| `src/integrations/harness-hooks.ts` | 参考 | `getHarnessContext()` — manifest hooks + capability hooks 合并逻辑 |
| `src/integrations/workflow-manifest.ts` | 参考 | `getHarnessHooksFromManifest()` — 从 YAML 读 hooks |
| `src/core/gates/delivery-gate.ts` | 参考 | delivery gate 逻辑，含 trailer 校验 |
| `src/core/workflow-engine.ts` | 参考 | 引擎编排 |

## 模式清单

- 测试：`vitest run`（monorepo，176 个 test files / 1404 tests）
- 类型检查：`npx tsc --noEmit`
- Harness hooks：manifest YAML 定义 → `getHarnessContext()` 按 phase 解析 | `classifyHook()` 区分 agent / CLI / skip
- 人工门：`--approver` 参数（change / design / review 三阶段）
- 引擎门禁：`evaluateDeliveryGate()` — commit trailer + 干净 worktree + verify cmd

## 风险区

| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| RISK | `.taiyi/changes/` — 8 old changes | 全部卡在 integration stage（缺 git trailer） | 本 change 走通后考虑 archive |
| RISK | `src/integrations/harness-hooks.ts` | `HarnessHook` 无覆盖测试 | 本变更不改引擎，不需处理 |
| RISK | `evaluateDeliveryGate()` | dev 阶段无真实代码 commit 时 delivery gate 会失败 | integration 前需有 commit（至少 docs 或 config） |

## Read First

1. `docs/taiyi/workflow-manifest.yaml` — 双 harness 配什么钩子（看完知道每个阶段的约束）
2. `src/integrations/harness-hooks.ts` — hooks 如何从 manifest 加载（看完知道打卡机制）
3. `src/core/gates/delivery-gate.ts` — delivery gate 怎么拦（看完知道 integration 通关条件）

## Handoff

- **change**：纯流程变更，无代码改动。Scope 不含修复旧 change。
- **design**：设计阶段无需架构决策（流程按既有 manifest 走）。主要输出是分阶段运行计划。

<!-- PROJECT-CONTEXT-END -->
# Change Graph: ecc-hybrid-harness

## Phases
### change (9 nodes)
**acceptance_criterion** (8)
  - change 阶段 complete 成功（human gate: --approver dongjun）
  - requirement 阶段产出 REQUIREMENT.md 且无 seed 残留
  - design 阶段产出 DESIGN.md（≥2 方案对比）
  - ... +5 more
**unknown** (1) workflow-manifest.yaml

### requirement (1 nodes)
**acceptance_criterion** (1) 待填写

### design (1 nodes)
**design_decision** (1) A

### ui-design (1 nodes)
**design_decision** (1) 待填写

### task (1 nodes)
**slice** (1) 0

### test (1 nodes)
**test_case** (1) 待填写

### integration (1 nodes)
**unknown** (1) 待填写

## Cross-Cutting Concerns
**1** SSOT violations: 0 high, 0 medium, 1 low
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "A" ≠ "0"

## Stats
- Total nodes: 15
- Total edges: 2
- Phases with nodes: 7/8


## review (✓)
**评审**:
- [x] **Approve** — 可合并
---

**当前**: integration · Skill: @taiyi-integration · 工件: INTEGRATION.md
**复杂度**: medium | Profile: full
**下一步**: 加载 @taiyi-integration，编辑 INTEGRATION.md

*引擎生成 · Agent 读此文件即可*

<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。
     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->