# REQUIREMENT: Agent mode: Translation API backend core

## User Stories

| ID | As a… | I want… | So that… |
|----|--------|---------|----------|
| US-1 | Developer | Send a text for translation via API | The communication with Product/Ops is instantly translated |
| US-2 | Developer | Stream a translation in real-time | I see partial results as they arrive instead of waiting for the full response |
| US-3 | System | Route translation to the correct strategy based on role directions | The LLM prompt fits the source→target role context |
| US-4 | Operator | Check API health status | I can monitor whether the translation service is ready to accept requests |
| US-5 | Developer | Log request metadata and error context | I can debug failed translations without parsing raw LLM output |

## Acceptance Criteria (Given / When / Then)

### US-1 — Non-streaming translation

- **Given** a running translation API server at `/api/translation/translate`
- **When** a `POST` request is sent with `{"text": "技术方案已评审", "from_role": "dev", "to_role": "product"}`
- **Then** the response returns HTTP 200 with a JSON body containing the translated text and the original source roles

### US-2 — Streaming translation

- **Given** a running translation API server at `/api/translation/translate/stream`
- **When** a `POST` request is sent with `{"text": "Sprint backlog needs grooming", "from_role": "ops", "to_role": "dev"}`
- **Then** the response is `text/event-stream` with `Content-Type: text/event-stream` and at least one SSE data event containing translated text

### US-3 — Strategy routing

- **Given** a `TranslationService` instance with 6 registered direction strategies (prod→dev, dev→prod, dev→ops, ops→dev, prod→ops, ops→prod)
- **When** `translate("后端重构计划", "dev", "ops")` is called
- **Then** the `DevToOpsStrategy` is selected and invoked, producing a context-aware translation suitable for the ops audience

### US-4 — Health endpoints

- **Given** a running application
- **When** `GET /health`, `GET /ready`, and `GET /live` are called
- **Then** each returns HTTP 200 with a JSON body containing `{"status": "ok"}`

### US-5 — Observability

- **Given** a `POST /api/translation/translate` request
- **When** the request is processed (success or failure)
- **Then** the request metadata (method, path, duration_ms, status_code) is logged via a request-logging middleware

## Traceability

| AC | Links to CHANGE.md |
|----|-------------------|
| US-1 | Success Criteria: POST /api/translation/translate returns 200 |
| US-2 | Success Criteria: POST /api/translation/translate/stream returns SSE |
| US-3 | Success Criteria: 6 translation directions routable |
| US-4 | Success Criteria: 3 health endpoints return 200 |
| US-5 | Success Criteria: middleware chain complete (log → error → response time) |

## Out of Scope

- Frontend UI or WebSocket transport
- Authentication / JWT tokens
- Persistent storage (database) for translation history
- Multi-model LLM routing
- Rate limiting or request throttling
