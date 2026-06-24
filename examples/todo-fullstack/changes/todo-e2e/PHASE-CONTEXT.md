# Change Graph: todo-e2e

## Phases
### change (10 nodes)
**risk** (3) E2E 测试假阳性 / 测试超时 / 模板与实际工件漂移
**acceptance_criterion** (3) All nine phases complete with gates passing / Fresh .taiyi/changes/ artifact dir contains 11/11 files / verify-report.json ok:true with zero errors
**unknown** (3) CI/CD pipeline / Workflow Engine / examples/full-flow-demo
**rollback** (1) E2E 测试持续失败 (>2 次重试)

### requirement (22 nodes)
**acceptance_criterion** (3) State shows integration completed / Artifact count equals expected 11 files / verify-report.json ok:true with zero errors
**unknown** (14)
  - CLI 参数错误
  - state.json 格式错误
  - 模板丢失
  - ... +11 more
**nfr** (5)
  - 无硬编码密钥/令牌
  - state.json 不包含敏感路径信息
  - 全流程 E2E < 60s
  - ... +2 more

### design (15 nodes)
**threat** (2) Spoofing / Tampering
**risk** (1) Vitest-based E2E
**design_decision** (3) 测试框架选型 / 夹具硬编码 vs 模板渲染 / B
**unknown** (4)
  - E2E Fixtures
  - Workflow Engine
  - Phase Registry
  - ... +1 more
**deployment_step** (4)
  - 合并 PR 到 main 分支
  - CI 自动运行全量测试（含 E2E）
  - npm publish（含语义化版本号）
  - ... +1 more
**rollback** (1) E2E 测试持续失败 (>2 次重试) 或 verify-report 出现 error

### ui-design (4 nodes)
**design_decision** (1) CLI/workflow only; no user interface surfaces.
**unknown** (3) N/A / N/A — CLI only / No visual interface to audit

### task (8 nodes)
**slice** (2) E2E workflow test / Inplace verify demo script
**risk** (2) E2E 假阳性 / 夹具数据漂移
**rollback** (2) git revert / git revert
**unknown** (2) 1 (无依赖,并行) / 2 (依赖 S1)

### test (13 nodes)
**test_case** (13)
  - workflow smoke — 9 phases complete
  - assertExpectedArtifacts — missing file detection
  - template fallback — no .hbs returns hardcoded md
  - ... +10 more

### review (14 nodes)
**unknown** (8)
  - Docs only — no code changes needed
  - 可读性
  - 可测试性
  - ... +5 more
**test_case** (6)
  - npm audit 通过
  - 无敏感数据日志
  - 测试数据无 PII
  - ... +3 more

### integration (9 nodes)
**unknown** (3) E2E workflow regression test and dogfood script covering ... / E2E_ARTIFACTS fixtures enriched with production-quality c... / full-flow-demo example now generates inspectable artifact...
**monitoring_metric** (5)
  - E2E pass rate
  - CI 耗时
  - artifact count
  - ... +2 more
**rollback** (1) E2E 测试持续失败 (>2 次重试) 或 verify-report 出现 error

## Cross-Cutting Concerns
**9** SSOT violations: 3 high, 4 medium, 2 low
- [MEDIUM] risk (change vs requirement): 风险评估跨阶段不一致: "E2E 测试假阳性" ≠ "CI 可用性 99%+"
- [MEDIUM] risk (change vs requirement): 风险评估跨阶段不一致: "测试超时" ≠ "无硬编码密钥/令牌"
- [MEDIUM] risk (change vs requirement): 风险评估跨阶段不一致: "模板与实际工件漂移" ≠ "state.json 不包含敏感路径信息"
- [HIGH] nfr (requirement vs design): 非功能需求跨阶段不一致: "CI 可用性 99%+" ≠ "Spoofing"
- [HIGH] nfr (requirement vs design): 非功能需求跨阶段不一致: "无硬编码密钥/令牌" ≠ "Tampering"
- [LOW] design_decision (design vs task): 设计决策跨阶段不一致: "B" ≠ "E2E workflow test"
- [LOW] design_decision (design vs task): 设计决策跨阶段不一致: "测试框架选型" ≠ "Inplace verify demo script"
- [MEDIUM] risk (task vs design): 风险评估跨阶段不一致: "E2E 假阳性" ≠ "Vitest-based E2E"
- [HIGH] rollback (task vs design): 回滚策略跨阶段不一致: "git revert" ≠ "E2E 测试持续失败 (>2 次重试) 或 verify-report 出..."

## Stats
- Total nodes: 95
- Total edges: 69
- Phases with nodes: 8/8


## dev (✓)
**开发**: TDD 已完成


---

**当前**: integration · Skill: @taiyi-integration · 工件: INTEGRATION.md
**复杂度**: medium | Profile: micro
**下一步**: 加载 @taiyi-integration，编辑 INTEGRATION.md

*引擎生成 · Agent 读此文件即可*

<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。
     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->