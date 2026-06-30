# Changelog

> 📦 较早的变更已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。

<!-- taiyi:registry-refactor --> 2026-06-30
# CHANGELOG: registry-refactor

## Added

- 5 个统一的 `Registry<T>` 抽象类，统一支持 builtin + YAML + node_modules(package.json) + programmatic 四类来源
  - `src/core/profile-registry.ts` — ProfileRegistry（7 个 builtin profile，支持 extends + 循环检测、YAML、nm 扫描）
  - `src/core/code-pattern-registry.ts` — CodePatternRegistry（13 个 builtin pattern，YAML、nm 扫描、code-gen 集成）
  - `src/core/ssot-rule-registry.ts` — SSOTRuleRegistry（12 个 builtin rule，ID-reference 取代位置配对）
  - `src/core/extractor-registry.ts` — ExtractorRegistry（8 个 builtin extractor，loader.ts 委托）
  - `src/core/runner-policy-registry.ts` — RunnerPolicyRegistry（4 个 preset + 2 个 helper，含 `selectRunnerForPolicy`）
- 公共导出：5 个 Registry 类 + `getDefault*` / `resetDefault*` 工厂，从 `src/index.ts` 全部 re-export
- 12 个新测试文件覆盖 registry 行为（builtin 保护、优先级覆盖、YAML 加载、循环检测、ID 引用等）

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

## Docs

- [x] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-

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
