# Changelog

> 📦 较早的变更已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。

<!-- taiyi:api-layer --> 2026-06-24

# CHANGELOG: api-layer

## Added

- FastAPI routing layer for translation API
- POST /translate endpoint for text translation
- GET /translate?stream=true for SSE streaming
- GET /health endpoint for service health checks
- GET /metrics endpoint for usage statistics
- Dependency injection via app.api.deps module

## Changed

-

## Fixed

-

## Docs

- [ ] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-

<!-- taiyi:backend-foundation --> 2026-06-24

# CHANGELOG: backend-foundation

## Added

- `app/__init__.py`, `app/main.py`: FastAPI application entry point with lifespan
- `app/config/`: Configuration module via `pydantic-settings`
- `app/core/`: Core processing logic (translation, metrics)
- `app/models/`: Pydantic request/response schemas
- `app/api/`: FastAPI routes, dependencies, error handlers
- `requirements.txt`: Python dependencies (FastAPI, uvicorn, pydantic, httpx)
- `Dockerfile`: Multi-stage Python image (slim → runtime, 194MB)
- `docker-compose.yml`: Service + persistent volume mount
- `Makefile`: Build/run/stop/dev shortcuts

## Changed

- (none)

## Fixed

- (none)

## Docs

- [x] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-

<!-- taiyi:llm-integration --> 2026-06-24

# CHANGELOG: llm-integration

## Added

- `app/llm/`: LLM integration layer (client, service, router)
- `TranslationService`: translate & translate_stream methods with LLMClient
- Streaming SSE endpoint (`/api/v1/translate-stream`)
- `LLMClient` for external LLM API calls (mock in tests)
- `app/api/__init__.py`, `app/llm/__init__.py` exports

## Changed

- (none)

## Fixed

- (none)

## Docs

- [x] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-

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
