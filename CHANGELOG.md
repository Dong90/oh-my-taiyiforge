# Changelog

> 📦 较早的变更已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。

<!-- taiyi:api-swagger --> 2026-07-04

# CHANGELOG: API 规范化

## Added

- app/controllers/v1/ — 版本化路由 (API v1)
- app/models/validation.py — 增强 Pydantic 验证
- app/config/hotreload.py — 配置热加载

## Changed

- 5 处硬编码结构替换为 registry 委托，老调用点行为不变：
  - `PROFILE_SKIPPED`（`auto/profile-keywords.ts`）→ 改为 derived view，不再维护 snapshot
  - `PATTERN_TO_TEMPLATE`（`code-pattern.ts`）→ CodePatternRegistry 单源
  - `EDGE_CATALOG`（`ssot-rules.ts`）→ SSOTRuleRegistry + ID 引用
  - `EXTRACTORS` Map（`extractors/`）→ ExtractorRegistry
  - runner cluster（`runner-clusters.ts`）→ RunnerPolicyRegistry
- 老 API（`buildEdges` / `detectSSOTViolations` / `loader.ts` / `runner-clusters.ts` 等）改为薄壳委托到 registry
- 统一 `register()` 守护风格（id 非空 + 来源检查）
- `console.warn` 全部切换到 `getLogger().warn`
- 删 `SEVERITY_MAP` 重复定义
- 删 dead `setDefaultTemplatesDir`

## Deprecated（V1.1 路线图）

- `yaml` 外部包引入 —— 仍走自研 parser 扩展
- 远程 YAML 加载 —— TODO
- `KEYWORD_PROFILE`（auto-plan）重写 —— 老路径仍工作
- 删除老 `PROFILE_SKIPPED` 实体 —— V1.1 切换为纯 derived view

## Fixed

- 5 个 builtin 集合由「散在多文件」变为「单一可枚举源」，降低后续添加成本
- 跨模块的 ID/字段命名漂移通过 ID-reference 修复（如 SSOT 规则不再依赖数组下标）

## Tests

- 1210 → **1296 passed**（+86，12 个新测试文件）
- TypeScript: 0 errors

## Rollback

```
git revert 2c725ff
```

<!-- taiyi:agent-mode-translation-api-backend-core --> 2026-06-27
# CHANGELOG: agent-mode-translation-api-backend-core

## Unreleased (merged from plan #1-#5 + registry-refactor)

### Changed
- 退出 GStack 主路径：交付链由 native `git + gh` 驱动，配置层新增 `docs/taiyi/delivery.yaml`（默认）+ `.taiyi/delivery.yaml`（项目覆盖）；harness 改用 Superpowers + ECC 双线（架构 / 代码审查 / QA / 发版 / 漏洞扫描 / 站点 QA / 会话 checkpoint / TDD 文档 全部由 ECC 覆盖，详见 `docs/taiyi/library-selection.md`）。旧 `scripts/install-optimal-fusion.sh` 已删除；`/taiyi:ship` `/taiyi:land` `/taiyi:commit` 退化为 chat-only 斜杠（CLI 报 exit 2 + chat-slash-only 提示）。
- `scripts/taiyi-forge.sh ship|land|commit` 不再转发到 node CLI，直接打印 chat-slash 提示。
- `src/core/harness-runner.ts` archive 命令匹配由 `command.includes("archive")` 改为 `tool === "taiyi" && command.startsWith("taiyi archive")`，避免误触发。
- `src/core/gates/delivery-gate.ts` 新仓库 base 检测由静默通过改为显式 fail + hints，提示先 `git push` 或 `git init`。

### Added
- `src/core/delivery-config.ts` `parseDeliveryYaml` 改用 `yaml@2.9.0` 标准库（替原 180 行手写正则 parser）+ 强类型守卫 + fail-soft。
- `src/core/delivery-plan.ts` `planDeliveryChain` 暴露 `DeliveryPlan.steps[]`，作为 `/taiyi:ship` `/taiyi:land` 的预览真源。
- `scripts/check-md-links.mjs` 纳入 + `npm run check:links`：扫描 markdown 内部链接，URL 含 `=` `,` 或形如 `<word>:<text>` 的模板占位符跳过；当前 baseline 5 个历史 broken（CONTRIBUTING.md / skill-fusion-principles.md / configuration.md / delivery-slash.md / diagrams/pipeline.md）将在后续清理。

### Notes (state.json 字段漂移 — 已知不修)
- `seeded` 字段：`initChange()` 返回对象的临时字段（`src/core/workflow-engine.ts:116,176`），**不应持久化**。现状 `bench-delta-final` / `demo-28-v28` / `lang-test` 3 个 state.json 含此字段为历史 engine bug 残留，**无功能影响**（所有读路径不消费该字段），下次 `writeState` 会自然覆写。
- `version` 字段：OCC 乐观锁字段（`src/core/workflow-engine.ts:218-239`），缺值时 `writeState` 用 `?? 0` 兜底，首次写入升到 1。现状 `bench-delta-final` / `token-bench-micro` 缺此字段，**无功能影响**。
- 5 个 state.json 均为历史数据（OCC 引入前或 engine 早期），建议下次 archive 时由 `archiveTaiyiChange` 路径自然清理 —— **本轮不主动改文件**。

### Removed
- `skills/taiyi-decompose/SKILL.md`（0 引用、未进 manifest 任何阶段）—— `prompts/` 28 个文件 + `prompts/inc/` 5 个文件全部有上游引用，本轮 0 删除。

### Fixed (plan #5: docs ↔ src 一致性同步)
- **handlers.ts ↔ docs 对齐**：`docs/taiyi/canonical-commands.md` 加 §「引擎 CLI 真源」段，列 35 个常用 CLI 子命令 ↔ 引擎函数映射（`src/plugin/handlers.ts` 真源）+ 14 个聊天斜杠 ↔ CLI 真源映射。`/taiyi:external-context` 实际由 `taiyiWorkflowSkill('external-context')` 路由（`src/core/runtime/workflow-skills.ts:135`），文档已正确。`taiyiPause` 走 cli/taiyi.ts:428 dispatch 路由到 `taiyiHandoff`，无需新 handler。
- **环境变量文档化**：`docs/taiyi/configuration.md` §5.1 加 50+ `TAIYI_*` 环境变量表格（按模块分组：引擎 Loop / Hooks / Agent / Human Gate / Token / Daemon / Ralph+Quality / Workflow / MCP+LSP / Logger）。原 §5 仅列 5 个常用变量，现扩到完整对照实现真源。
- **Capability 文档**：`docs/taiyi/integrations.md` §CapabilityId 完整列表加 14 个 capability 行 + 向后兼容 NOTE（9 个"已退场" capability 保留在 `CapabilityId` 类型里以兼容历史 `.taiyi/providers.yaml`）。
- **profile `ui`**：`src/core/builtin-profiles.ts` `ui` profile 加 `auxiliaryHints: ["taiyi-restyle"]`，兑现 docs/USAGE.md §Profile 表中"restyle 默认加载"承诺。

<!-- taiyi:todo-api --> 2026-06-24
# CHANGELOG: todo-api
## Added

- app/cache/redis_cache.py — Redis 缓存层 + @cached 装饰器
- app/tasks/celery_app.py — Celery 配置
- app/tasks/translation.py — 异步翻译任务

## Changed

- 无

## Docs

- [x] 缓存 + 异步队列代码就绪

<!-- taiyi:prometheus-opentelemetry --> 2026-07-04

# CHANGELOG: 可观测性

## Added

- app/telemetry/metrics.py — Prometheus 指标中间件 + /metrics 端点
- app/telemetry/tracing.py — OpenTelemetry 配置

## Changed

- 无

## Docs

- [x] 可观测性代码就绪

<!-- taiyi:repository-pattern-sqlalchemy-orm-alembic --> 2026-07-04

# CHANGELOG: 数据层

## Added

- app/db/ — SQLAlchemy async engine + session factory
- app/repositories/ — BaseRepository CRUD 抽象 + UserRepository
- app/models/db_models.py — User + TranslationRecord 数据模型
- alembic/ — 迁移配置

## Changed

- 无

## Docs

- [x] 数据层代码就绪

<!-- taiyi:api-adr --> 2026-07-04

# CHANGELOG: 文档完善

## Added

- docs/adr/001-use-strategy-pattern.md — 策略模式决策记录
- docs/adr/002-use-adapter-pattern.md — 适配器模式决策记录
- docs/deploy.md — 部署文档（本地 + 生产）
- docs/dev-guide.md — 开发指南（项目结构 + 添加翻译方向）

## Changed

- 无

## Fixed

- 无

## Docs

- [x] ADR 文档就绪
- [x] 部署文档就绪
- [x] 开发指南就绪

<!-- taiyi:translation-assistant-tests --> 2026-07-04

# CHANGELOG: 翻译助手测试覆盖增强

## Added

- tests/integration/ — 集成测试（翻译 API 完整调用链）
- tests/e2e/ — E2E 测试目录
- tests/performance/ — 性能测试目录
- .coveragerc — pytest-cov 覆盖率配置（80% 门禁）

## Changed

- 无

## Fixed

- 无

## Docs

- [x] 测试目录结构完备

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