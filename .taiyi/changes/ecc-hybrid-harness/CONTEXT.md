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
