
## Archived at 2026-07-03

<!-- taiyi:agent-mode-translation-api-backend-core --> 2026-06-27
# CHANGELOG: agent-mode-translation-api-backend-core

## Added

- `services/translation_api/`: Full backend translation API with Adapter + Strategy architecture
- 6 translation direction strategies (dev↔product, dev↔ops, product↔ops)
- OpenAI LLM adapter with streaming support
- SSE streaming endpoint (`POST /api/translation/translate/stream`)
- 3 health endpoints (GET /health, /ready, /live)
- Middleware chain: request logging, error handling, response time
- Pydantic v2 request/response schemas with role validation
- 21 pytest tests covering config, strategies, services, middleware, controllers

## Changed

- (none)

## Fixed

- (none)
## Success Criteria Met

- [x] All 21 tests pass (config 3, strategies 5, services 6, middleware 1, controllers 6)
- [x] POST /api/translation/translate returns 200 with translated text
- [x] POST /api/translation/translate/stream returns SSE with content-type text/event-stream
- [x] 6 translation directions routable via TranslationService factory
- [x] 3 health endpoints return HTTP 200 with `{"status": "ok"}`
- [x] Middleware chain operational (logging, error handling, X-Response-Time)
## Rollback

```
git revert HEAD --no-edit
```

<!-- taiyi:frontend-ui --> 2026-06-24
# CHANGELOG: frontend-ui

## Added

- examples/translation-assistant/index.html: Single-file frontend with responsive layout
- Source text input with Enter-to-translate + Shift+Enter for newline
- Role selection dropdown (product→dev, dev→product, ops→dev)
- SSE streaming display via fetch reader (fallback to POST/JSON)
- Loading bar animation + error banner
- Mobile-responsive CSS (flexbox, media queries)
## Changed

- (none)

## Fixed

- (none)


## Success Criteria Met

- [x] All 21 tests pass (config 3, strategies 5, services 6, middleware 1, controllers 6)
- [x] POST /api/translation/translate returns 200 with translated text
- [x] POST /api/translation/translate/stream returns SSE with content-type text/event-stream
- [x] 6 translation directions routable via TranslationService factory
- [x] 3 health endpoints return HTTP 200 with `{"status": "ok"}`
- [x] Middleware chain operational (logging, error handling, X-Response-Time)

## Rollback

```
git revert HEAD --no-edit
```

<!-- taiyi:frontend-ui --> 2026-06-24
# CHANGELOG: frontend-ui

## Added

- examples/translation-assistant/index.html: Single-file frontend with responsive layout
- Source text input with Enter-to-translate + Shift+Enter for newline
- Role selection dropdown (product→dev, dev→product, ops→dev)
- SSE streaming display via fetch reader (fallback to POST/JSON)
- Loading bar animation + error banner
- Mobile-responsive CSS (flexbox, media queries)

## Changed

- (none)

## Fixed

- (none)

## Docs

- [x] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-

## Archived at 2026-07-04

<!-- taiyi:todo-api --> 2026-06-24
# CHANGELOG: todo-api

## Added

- Express CRUD API（6 endpoints）：健康检查、待办增删改查
- 内存 Map 存储（TodoStore），支持所有 CRUD 操作
- 输入校验：空 title 返回 400
- 9 个测试 case，覆盖全量 CRUD + 边界

## Changed

- 无

## Fixed

- 无

<!-- taiyi:todo-e2e --> 2026-06-24
# CHANGELOG: todo-e2e

## Added

- E2E smoke test（`e2e/smoke.test.js`）：自动启动后端、验证健康检查、CRUD 全流程

## Changed

- 无

## Fixed

- 无

<!-- taiyi:todo-ui --> 2026-06-24
# CHANGELOG: todo-ui

## Added

-

## Changed

-

## Fixed

-

## Docs

- [x] README / AGENTS.md synced
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

<!-- taiyi:jwt-api-key-cors --> 2026-07-04
# CHANGELOG: 安全机制

## Added

- app/middleware/auth.py — JWT 认证
- app/middleware/ratelimit.py — slowapi 限流
- app/middleware/cors_config.py — CORS 细粒度
- app/controllers/auth_controller.py — 登录端点

## Changed

- 无

## Docs

- [x] 安全机制代码就绪

## Archived at 2026-07-04

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

- 退出 GStack 主路径：交付链由 native `git + gh` 驱动，配置层新增 `docs/taiyi/delivery.yaml`（默认）+
  `.taiyi/delivery.yaml`（项目覆盖）；harness 改用 Superpowers + ECC 双线（架构 / 代码审查 / QA
  / 发版 / 漏洞扫描 / 站点 QA / 会话 checkpoint / TDD 文档 全部由 ECC 覆盖，详见 `docs/taiyi/library-selection.md`）。旧
  `scripts/install-optimal-fusion.sh` 已删除；`/taiyi:ship` `/taiyi:land` `/taiyi:commit`
  退化为 chat-only 斜杠（CLI 报 exit 2 + chat-slash-only 提示）。
- `scripts/taiyi-forge.sh ship|land|commit` 不再转发到 node CLI，直接打印 chat-slash 提示。
- `src/core/harness-runner.ts` archive 命令匹配由 `command.includes("archive")` 改为
  `tool === "taiyi" && command.startsWith("taiyi archive")`，避免误触发。
- `src/core/gates/delivery-gate.ts` 新仓库 base 检测由静默通过改为显式 fail + hints，提示先 `git push` 或 `git init`。

### Added

- `src/core/delivery-config.ts` `parseDeliveryYaml` 改用 `yaml@2.9.0` 标准库（替原 180 行手写正则 parser）+ 强类型守卫 +
  fail-soft。
- `src/core/delivery-plan.ts` `planDeliveryChain` 暴露 `DeliveryPlan.steps[]`，作为 `/taiyi:ship` `/taiyi:land`
  的预览真源。
- `scripts/check-md-links.mjs` 纳入 + `npm run check:links`：扫描 markdown 内部链接，URL 含 `=` `,` 或形如
  `<word>:<text>` 的模板占位符跳过；当前 baseline 5 个历史 broken（CONTRIBUTING.md / skill-fusion-principles.md /
  configuration.md / delivery-slash.md / diagrams/pipeline.md）将在后续清理。

### Notes (state.json 字段漂移 — 已知不修)

- `seeded` 字段：`initChange()` 返回对象的临时字段（`src/core/workflow-engine.ts:116,176`），**不应持久化**。现状
  `bench-delta-final` / `demo-28-v28` / `lang-test` 3 个 state.json 含此字段为历史 engine
  bug 残留，**无功能影响**（所有读路径不消费该字段），下次 `writeState` 会自然覆写。
- `version` 字段：OCC 乐观锁字段（`src/core/workflow-engine.ts:218-239`），缺值时 `writeState` 用 `?? 0`
  兜底，首次写入升到 1。现状 `bench-delta-final` / `token-bench-micro` 缺此字段，**无功能影响**。
- 5 个 state.json 均为历史数据（OCC 引入前或 engine 早期），建议下次 archive 时由 `archiveTaiyiChange` 路径自然清理 ——
  **本轮不主动改文件**。

### Removed

- `skills/taiyi-decompose/SKILL.md`（0 引用、未进 manifest 任何阶段）—— `prompts/` 28 个文件 + `prompts/inc/`
  5 个文件全部有上游引用，本轮 0 删除。

### Fixed (plan #5: docs ↔ src 一致性同步)

- **handlers.ts ↔ docs 对齐**：`docs/taiyi/canonical-commands.md`
  加 §「引擎 CLI 真源」段，列 35 个常用 CLI 子命令 ↔ 引擎函数映射（`src/plugin/handlers.ts` 真源）+ 14 个聊天斜杠 ↔
  CLI 真源映射。`/taiyi:external-context` 实际由 `taiyiWorkflowSkill('external-context')`
  路由（`src/core/runtime/workflow-skills.ts:135`），文档已正确。`taiyiPause` 走 cli/taiyi.ts:428 dispatch 路由到
  `taiyiHandoff`，无需新 handler。
- **环境变量文档化**：`docs/taiyi/configuration.md` §5.1 加 50+ `TAIYI_*` 环境变量表格（按模块分组：引擎 Loop / Hooks /
  Agent / Human Gate / Token / Daemon / Ralph+Quality / Workflow / MCP+LSP /
  Logger）。原 §5 仅列 5 个常用变量，现扩到完整对照实现真源。
- **Capability 文档**：`docs/taiyi/integrations.md`
  §CapabilityId 完整列表加 14 个 capability 行 + 向后兼容 NOTE（9 个"已退场" capability 保留在 `CapabilityId`
  类型里以兼容历史 `.taiyi/providers.yaml`）。
- **profile `ui`**：`src/core/builtin-profiles.ts` `ui` profile 加
  `auxiliaryHints: ["taiyi-restyle"]`，兑现 docs/USAGE.md §Profile 表中"restyle 默认加载"承诺。

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
