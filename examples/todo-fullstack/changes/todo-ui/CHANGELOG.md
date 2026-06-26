---
phase: integration
skill: taiyi-integration
gate: auto
produces: INTEGRATION.md
upstream: [review, dev, test]
downstream: []
---
<!-- phase:integration skill:taiyi-integration gate:auto est:15min produces:INTEGRATION.md upstream:[review,dev,test] downstream:[] cplx:[ALL]1steps +[M+]4 +[H]2 -->
# INTEGRATION: E2E Demo

> **Release**: `1.0.0` | **Date**: 2026-06-22 | **Status**: deployed

---

## Step 1: Changelog & Breaking Changes
> **[ALL]** Goal: 下游知道变了什么 | Inputs: 所有上游工件
<!-- Action: Added/Changed/Fixed/Deprecated/Removed/Security。每条: 什么变了+对用户影响 -->

- **test**: E2E workflow regression test and dogfood script covering all nine phases.
- **refactor**: E2E_ARTIFACTS fixtures enriched with production-quality content depth (更多 FR/AC, visual_* fields, richer design options).
- **docs**: full-flow-demo example now generates inspectable artifacts in .taiyi/archive/.

### Breaking Changes
_无_

<!-- Validate: 每条让读者一眼看懂"对我有什么影响"？Breaking有迁移指引？ -->

## Step 2: Migration
> **[MEDIUM+]** Goal: 迁移一步完成 | Inputs: DESIGN.md §5, §9
<!-- Action: DDL变更/环境变量变更/配置变更 -->

### 数据库
_未提供 DDL 变更_

### 环境变量
- 新增: | 修改: | 删除: 

### 配置
| 配置项 | 旧值 | 新值 |
|--------|------|------|
| _无配置变更_ |

<!-- Validate: 迁移可一条命令完成？失败可回滚？ -->

## Step 3: Deployment Checklist
> **[MEDIUM+]** Goal: 上线不遗漏 | Inputs: Step2
<!-- Action: 逐项确认DB/环境/灰度/监控/告警/回滚/通知 -->

- [ ] DB迁移已执行
- [ ] 环境变量已配置
- [ ] 灰度发布已确认
- [ ] 监控dashboard已更新
- [ ] 告警规则已配置
- [ ] 回滚已验证
- [ ] 上下游已通知

<!-- Validate: 每步有owner？步骤无遗漏？ -->

## Step 4: Observability
> **[MEDIUM+]** Goal: 出问题能发现 | Inputs: REQUIREMENT.md §4, DESIGN.md §11
<!-- Action: Dashboard+Alert+Runbook是一级交付物 -->

### Dashboard
GitHub Actions CI Dashboard

### Alerts
| 告警 | 条件 | 严重度 | 渠道 |
|------|------|--------|------|
| E2E 失败 | vitest 非零退出 | high | GitHub Actions / Slack |
| 工件数不匹配 | 文件数 != 预期 | medium | GitHub Actions |

### Runbook

<!-- Validate: 每个关键指标有dashboard+alert+runbook？ -->

## Step 5: Post-Launch Watch
> **[MEDIUM+]** Goal: 确认稳了才算完 | Inputs: Step4
<!-- Action: 观察期+退出标准+异常处理 -->

- **观察期**: 24h
- **观察指标**: CI pass rate, E2E 耗时, artifact count
- **退出标准**: 24h 内 E2E pass rate = 100%, 工件完整
- **异常处理**: Slack #eng-alerts → on-call 处理

<!-- Validate: 退出标准量化？异常有应急预案？ -->

## Step 6: Rollback Plan
> **[HIGH]** Goal: 出问题能快速回退 | Inputs: DESIGN.md §11
<!-- Action: 触发条件(量化)+操作步骤(精确到命令)+预计时间 -->

**触发**: E2E 测试持续失败 (>2 次重试) 或 verify-report 出现 error
**操作**: 1. git revert HEAD~1 2. npm test && npm run build 确认通过
**时间**: ≤5min

<!-- Validate: 触发量化？步骤精确？≤30min？ -->

## Step 7: Monitoring & Alerts
> **[HIGH]** Goal: 长期监控不盲飞 | Inputs: Step4
<!-- Action: 指标+基线+告警阈值+严重度。覆盖所有SC -->

| 指标 | 基线 | 告警阈值 | 严重度 |
|------|------|---------|--------|
| E2E pass rate | 100% | <100% | high |
| CI 耗时 | ~35s | >60s | medium |
| artifact count | 11 | <11 | medium |

<!-- Validate: 所有SC对应指标？基线+阈值有数据支撑？ -->

## Release
- **Version**: `1.0.0` | **Date**: 2026-06-22 | **Artifacts**: _npm_

## Step 8: System State Update
> **[HIGH]** Goal: 保持全局活文档同步 | Inputs: 所有上游工件
<!-- Action: 更新 ARCHITECTURE.md · OpenAPI spec · DB schema · ERD · docs/c4/ -->
<!-- 离散的 DESIGN.md 是"变更记录"，下面这些全局文档是"系统真源"——半年后新 Agent 从此拼出全貌 -->

- [ ] 若新增/修改 API：更新 `docs/api/` 或 OpenAPI spec
- [ ] 若新增/修改模块：更新 `ARCHITECTURE.md` 和 `docs/c4/`
- [ ] 若新增/修改数据模型：更新 schema registry 或 ERD
- [ ] 若变更影响 CI/CD：更新 `.github/workflows/` 文档
- [ ] 若新增外部依赖：更新 `package.json` + 依赖文档
- [ ] 无活文档变更（仅测试/文档级变动）

> 半年后新 Agent 应从全局文档拼出系统全貌，而非翻阅几百份离散的 DESIGN.md。

---
## Quality Gate
<!-- Evidence-first: 每项部署检查需要可验证证据。gstack PD#5: Dashboard+Alert+Runbook不是上线后清理项 -->

- ⬜ S1 Changelog清晰完整
- ⬜ S1 Breaking有迁移指引
- ⬜ [M+] S2 迁移可一键执行
- ⬜ [M+] S3 部署清单无遗漏
- ⬜ [M+] S4 Dashboard+Alert+Runbook完整 | gstack PD#5
- ⬜ [M+] S5 观察期+退出标准明确
- ⬜ [H]  S6 回滚≤30min
- ⬜ [H]  S7 监控覆盖所有SC
- ⬜ 上下游已通知
- ⬜ Release已标注
