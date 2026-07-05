# Changelog

> 📦 较早的变更已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。

<!-- taiyi:template-placeholder-cleanup --> 2026-07-05
# CHANGELOG: 模板占位符清理 + 复杂度感知渲染

## Changed

- **模板移除所有占位符**：8 个 `.hbs` 模板的 `{{else}}` 分支中删除 `请填写 xxx`、`待补充`、`[可用性指标]`、`[流程名]` 等占位符文本。`[MEDIUM+]` 段数据缺失时整段不渲染而非显示空表
- **seed 复杂度感知**：`buildSeedJson` 根据 `complexity.score` 分级生成 seed 数据。`[MEDIUM+]` 字段仅在 score≥8 时生成，`[HIGH]` 在 score≥15 时生成
- **Quality Gate 条件化**：8 个模板的 Gate 检查项与对应的数据字段联动。数据不存在时 Gate 项也不出现
- **autoFill 复杂度打通**：`forceRenderPhaseFromJson` 从 `state.json` 读取复杂度 → `autoFillJson` → `buildSeedJson`，确保复杂度升级后 re-render 自动补全缺失字段

## Fixed

- seed 数据中 `待填写`/`待估`/`待评审`/`未指定` 全部清除为空，不再通过 autoFill 注入用户工件
- 低复杂度变更不再渲染空表或占位符文本的 `[MEDIUM+]` 段

<!-- taiyi:docker-compose-ci-cd --> 2026-07-04
# CHANGELOG: Docker 容器化 + Compose + CI/CD + 环境隔离

## Added

- `Dockerfile` — Python 3.11-slim 镜像，FastAPI + uvicorn，健康检查
- `docker-compose.yml` — 一键启动 backend (8000) + frontend Nginx (8080)
- `nginx.conf` — 前端反向代理，SSE 流式支持
- `.github/workflows/translation-assistant-ci.yml` — lint + pytest + docker build
- `.env.example` — 环境变量模板（TAIYI_ENV 区分 dev/staging/prod）

## Changed

- （无业务代码改动）

## Fixed

- （无）

## Docs

- [x] 部署文件完备
- [ ] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-

<!-- taiyi:template-translation-api-core-backend --> 2026-06-26
# CHANGELOG: Translation API — Core Backend

## Added

- Translation API: FastAPI-based service with 6 direction-specific LLM strategies
  - product↔dev, dev↔ops, product↔ops bi-directional translation
  - Strategy pattern: each direction has its own system prompt
  - Adapter pattern: pluggable LLM backends (OpenAI default)
  - Streaming SSE endpoint for real-time translation
- Middleware: request logging, error handling, response time tracking
- Tests: 11/11 passing (unit + integration with mocked LLM)
- Pydantic models for request/response validation
- Settings management via pydantic-settings (env-based)

## Changed

- N/A (greenfield change)

## Fixed

- N/A (greenfield change)

## Docs / Skills

- [ ] README / AGENTS.md 已同步（若对外行为变化）
- [ ] OpenSpec / 规格已 archive（若适用）

## Rollback

Revert the `.taiyi/changes/template-translation-api-core-backend/` directory and remove `dev_bundle/` from deployment
path.

## <!-- taiyi:ecc-hybrid-harness --> 2026-07-03
phase: integration skill: taiyi-integration gate: auto produces: CHANGELOG.md upstream: [review, dev, test] downstream:
[]

---

# CHANGELOG: ECC Hybrid 双 harness 走通

> **Release**: v0.23-harness-verify | **Date**: 2026-07-03 | **Status**: verified

---

## Added

- **chore**: 完成 Superpowers + ECC 双线 harness 九阶段端到端验证
- 验证 workflow-manifest.yaml 的 harness 约束：所有 9 个阶段钩子可触发、可打卡
- 验证 3 个 human gate（change/design/review）的 `--approver` 机制正常拦截
- 验证 `harness-check` 命令在 `--auto` 模式下的双线打卡机制

### Breaking Changes

_无_

### Migration

无代码或配置变更。

## Deployment Checklist

- [x] vitest: 176 test files, 1404 tests passed
- [x] tsc --noEmit: 0 errors
- [x] npm audit: no critical/high
- [x] 所有 9 个阶段工件已产出

## Verdict

流程验证通过。双 harness（Superpowers + ECC）在 `--auto` 模式下正常工作。每个阶段的 harness-check 打卡机制正确，human
gate 正确拦截。

---

## Quality Gate

- [x] S1 Changelog 清晰完整
- [x] S1 No breaking changes
- [x] S7 监控: vitest pass rate 100%

## <!-- taiyi:add-cli-help-command --> 2026-07-04
phase: integration skill: taiyi-integration gate: auto produces: INTEGRATION.md upstream: [review, dev, test]
downstream: []

---

<!-- phase:integration skill:taiyi-integration gate:auto est:15min produces:INTEGRATION.md upstream:[review,dev,test] downstream:[] cplx:[ALL]1steps +[M+]4 +[H]2 -->

# INTEGRATION: Add CLI --help command v0.1.0

> **Release**: `0.1.0` | **Date**: 2026-07-04 | **Status**: deployed

---

## Step 1: Changelog & Breaking Changes

> **[ALL]** Goal: 下游知道变了什么 | Inputs: 所有上游工件

<!-- Action: Added/Changed/Fixed/Deprecated/Removed/Security。每条: 什么变了+对用户影响 -->

- **feat**: 添加 help 子命令，输出所有可用命令及描述
- **feat**: help <name> 显示单命令详细帮助
- **chore**: 更新 9 阶段工件模板

### Breaking Changes

_无_

<!-- Validate: 每条让读者一眼看懂"对我有什么影响"？Breaking有迁移指引？ -->

## Step 2: Migration

> **[MEDIUM+]** Goal: 迁移一步完成 | Inputs: DESIGN.md §5, §9

<!-- Action: DDL变更/环境变量变更/配置变更 -->

### 数据库

无 DDL 变更

### 环境变量

- 新增: | 修改: | 删除:

### 配置

| 配置项     | 旧值 | 新值 |
| ---------- | ---- | ---- |
| 无配置变更 |

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

### Alerts

| 告警          | 条件              | 严重度 | 渠道             |
| ------------- | ----------------- | ------ | ---------------- |
| _CI 失败告警_ | _vitest 非零退出_ | _high_ | _GitHub Actions_ |

### Runbook

<!-- Validate: 每个关键指标有dashboard+alert+runbook？ -->

## Step 5: Post-Launch Watch

> **[MEDIUM+]** Goal: 确认稳了才算完 | Inputs: Step4

<!-- Action: 观察期+退出标准+异常处理 -->

- **观察期**: 3 天
- **观察指标**: help 命令调用次数
- **退出标准**: 无用户报 help 不可用
- **异常处理**:

<!-- Validate: 退出标准量化？异常有应急预案？ -->

## Step 6: Rollback Plan

> **[HIGH]** Goal: 出问题能快速回退 | Inputs: DESIGN.md §11

<!-- Action: 触发条件(量化)+操作步骤(精确到命令)+预计时间 -->

**触发**: help 命令输出错误 **操作**: 1. git revert HEAD 2. npm run build **时间**: ≤5min

<!-- Validate: 触发量化？步骤精确？≤30min？ -->

## Step 7: Monitoring & Alerts

> **[HIGH]** Goal: 长期监控不盲飞 | Inputs: Step4

<!-- Action: 指标+基线+告警阈值+严重度。覆盖所有SC -->

| 指标             | 基线 | 告警阈值 | 严重度 |
| ---------------- | ---- | -------- | ------ |
| vitest pass rate | 100% | <100%    | high   |

<!-- Validate: 所有SC对应指标？基线+阈值有数据支撑？ -->

## Release

- **Version**: `0.1.0` | **Date**: 2026-07-04 | **Artifacts**: _npm_

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

<!-- Evidence-first: 每项部署检查需要可验证证据。PD#5: Dashboard+Alert+Runbook不是上线后清理项 -->

- ⬜ S1 Changelog清晰完整
- ⬜ S1 Breaking有迁移指引
- ⬜ [M+] S2 迁移可一键执行
- ⬜ [M+] S3 部署清单无遗漏
- ⬜ [M+] S4 Dashboard+Alert+Runbook完整 | PD#5
- ⬜ [M+] S5 观察期+退出标准明确
- ⬜ [H] S6 回滚≤30min
- ⬜ [H] S7 监控覆盖所有SC
- ⬜ 上下游已通知
- ⬜ Release已标注

<!-- taiyi:ty-5beh5qoa --> 2026-07-05
---

phase: integration skill: taiyi-integration gate: auto produces: INTEGRATION.md upstream: [review, dev, test]
downstream: []
---

<!-- phase:integration skill:taiyi-integration gate:auto est:15min produces:INTEGRATION.md upstream:[review,dev,test] downstream:[] cplx:[ALL]1steps +[M+]4 +[H]2 -->

# INTEGRATION: 巡检九阶段文档质量 — 集成闭环

> **Release**: `1.0.0` | **Date**: 2026-07-05 | **Status**: completed

---

## Step 1: Changelog & Breaking Changes

> **[ALL]** Goal: 下游知道变了什么 | Inputs: 所有上游工件

<!-- Action: Added/Changed/Fixed/Deprecated/Removed/Security。每条: 什么变了+对用户影响 -->

- **docs**: 完成 add-cli-help-command 和 ecc-hybrid-harness 九阶段质量巡检
- **chore**: 产出 REPORT.md 含双维度评分和共性问题汇总

### Breaking Changes

无

<!-- Validate: 每条让读者一眼看懂"对我有什么影响"？Breaking有迁移指引？ -->

## Step 2: Migration

> **[MEDIUM+]** Goal: 迁移一步完成 | Inputs: DESIGN.md §5, §9

<!-- Action: DDL变更/环境变量变更/配置变更 -->

### 数据库

无 DDL 变更

### 环境变量

- 新增: | 修改: | 删除:

### 配置

| 配置项     | 旧值 | 新值 |
| ---------- | ---- | ---- |
| 无配置变更 |

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

### Alerts

| 告警        | 条件            | 严重度 | 渠道           |
| ----------- | --------------- | ------ | -------------- |
| CI 失败告警 | vitest 非零退出 | high   | GitHub Actions |

### Runbook

<!-- Validate: 每个关键指标有dashboard+alert+runbook？ -->

## Step 5: Post-Launch Watch

> **[MEDIUM+]** Goal: 确认稳了才算完 | Inputs: Step4

<!-- Action: 观察期+退出标准+异常处理 -->

- **观察期**: [N天/小时]
- **观察指标**:
- **退出标准**:
- **异常处理**:

<!-- Validate: 退出标准量化？异常有应急预案？ -->

## Step 6: Rollback Plan

> **[HIGH]** Goal: 出问题能快速回退 | Inputs: DESIGN.md §11

<!-- Action: 触发条件(量化)+操作步骤(精确到命令)+预计时间 -->

**触发**: N/A — 纯只读巡检 **操作**: 1. 删除 REPORT.md 2. 命令 **时间**: ≤1 min

<!-- Validate: 触发量化？步骤精确？≤30min？ -->

## Step 7: Monitoring & Alerts

> **[HIGH]** Goal: 长期监控不盲飞 | Inputs: Step4

<!-- Action: 指标+基线+告警阈值+严重度。覆盖所有SC -->

| 指标             | 基线 | 告警阈值 | 严重度 |
| ---------------- | ---- | -------- | ------ |
| vitest pass rate | 100% | <100%    | high   |

<!-- Validate: 所有SC对应指标？基线+阈值有数据支撑？ -->

## Release

- **Version**: `1.0.0` | **Date**: 2026-07-05 | **Artifacts**: npm

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

<!-- Evidence-first: 每项部署检查需要可验证证据。PD#5: Dashboard+Alert+Runbook不是上线后清理项 -->

- ⬜ S1 Changelog清晰完整
- ⬜ S1 Breaking有迁移指引
- ⬜ [M+] S2 迁移可一键执行
- ⬜ [M+] S3 部署清单无遗漏
- ⬜ [M+] S4 Dashboard+Alert+Runbook完整 | PD#5
- ⬜ [M+] S5 观察期+退出标准明确
- ⬜ [H] S6 回滚≤30min
- ⬜ [H] S7 监控覆盖所有SC
- ⬜ 上下游已通知
- ⬜ Release已标注
