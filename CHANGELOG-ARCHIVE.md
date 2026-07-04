# Changelog Archive

> 自动归档：CHANGELOG.md 超出 200 行时较早的条目移至此处。

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

## Docs

- [x] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-
