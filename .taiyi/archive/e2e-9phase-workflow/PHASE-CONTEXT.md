# Change Graph: e2e-9phase-workflow

## Phases
### change (7 nodes)
**risk** (2) 引擎内部 API 变动 / 测试执行时间过长
**acceptance_criterion** (4)
  - 创建 mock 的 .taiyi/changes/{slug}/ 目录结构，九阶段全流程走通后所有 artifac...
  - 每个阶段 complete 后 status 的 currentPhase 正确推进到下一阶段
  - review 阶段评分 ≥9.5 时通过，<9.5 时被拒绝
  - ... +1 more
**unknown** (1) tests/e2e

### requirement (17 nodes)
**acceptance_criterion** (5)
  - 九阶段全流程模拟：mock 的 .taiyi/changes/{slug}/ 目录走通所有阶段后，每个阶段的 ar...
  - 阶段推进正确性：每个阶段执行 complete 后，调用 engine.getState(slug) 的 curr...
  - review 评分门禁：四维评分均为 ≥9.5 时 complete 通过；任一维度 <9.5 时 complet...
  - ... +2 more
**unknown** (11)
  - artifact JSON Schema 校验失败
  - review 评分不达标
  - profile 阶段不匹配
  - ... +8 more
**nfr** (1) 完整九阶段模拟测试执行时间 < 30s

### design (15 nodes)
**threat** (1) 测试 fixture 包含真实路径信息
**risk** (2) 新增测试文件到 tests/core/ / 新增测试 fixture 到 tests/fixtures/9phase/
**design_decision** (3) 分阶段 vs 整体文件 / Harness 抽象层 / B
**unknown** (4)
  - full-9-phase.test.ts
  - review-gate-scores.test.ts
  - blocked-by-check.test.ts
  - ... +1 more
**deployment_step** (5)
  - 1. 创建 tests/fixtures/9phase/ 目录及 valid/invalid fixture JSON
  - 2. 编写 full-9-phase.test.ts（顺序调用 engine API）
  - 3. 编写 review-gate-scores.test.ts（评分门禁专项）
  - ... +2 more

### ui-design (4 nodes)
**design_decision** (1) tests/core/ 目录下的 E2E 测试文件 — 无用户 UI，纯 CLI/引擎测试
**unknown** (3) initialized / phase_running / phase_completed

### task (14 nodes)
**slice** (4)
  - E2E 九阶段全流程测试
  - Review 评分门禁测试
  - Quality gate 拦截专项测试
  - ... +1 more
**risk** (3) engine API 签名在实际调用时可能与 fixture 假设不符 / 评分门禁阈值可能硬编码于 engine 内部无法外部覆盖 / Zod schema 字段变更可能导致校验逻辑失效
**rollback** (4)
  - git checkout -- tests/core/full-9-phase.test.ts 删除测试文件
  - git checkout -- tests/core/review-gate-scores.test.ts 删除测试文件
  - git checkout -- tests/core/blocked-by-check.test.ts 删除测试文件
  - ... +1 more
**unknown** (3) W1: 核心 E2E 流程 / W2: 专项门禁测试 / W3: 集成验证

## Cross-Cutting Concerns
**7** SSOT violations: 1 high, 3 medium, 3 low
- [MEDIUM] risk (change vs requirement): risk 跨阶段不一致: "引擎内部 API 变动" ≠ "完整九阶段模拟测试执行时间 < 30s"
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "B" ≠ "E2E 九阶段全流程测试"
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "分阶段 vs 整体文件" ≠ "Review 评分门禁测试"
- [LOW] design_decision (design vs task): design_decision 跨阶段不一致: "Harness 抽象层" ≠ "Quality gate 拦截专项测试"
- [HIGH] nfr (requirement vs design): nfr 跨阶段不一致: "完整九阶段模拟测试执行时间 < 30s" ≠ "测试 fixture 包含真实路径信息"
- [MEDIUM] risk (task vs design): risk 跨阶段不一致: "engine API 签名在实际调用时可能与 fixture 假设不符" ≠ "新增测试文件到 tests/core/"
- [MEDIUM] risk (task vs design): risk 跨阶段不一致: "评分门禁阈值可能硬编码于 engine 内部无法外部覆盖" ≠ "新增测试 fixture 到 tests/fixtures/9phase/"

## Stats
- Total nodes: 57
- Total edges: 10
- Phases with nodes: 5/8


## task (✓)


---

**当前**: dev · Skill: @taiyi-dev · 工件: DEV.md
**复杂度**: low | Profile: full
**下一步**: 加载 @taiyi-dev，编辑 DEV.md

*引擎生成 · Agent 读此文件即可*

<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。
     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->