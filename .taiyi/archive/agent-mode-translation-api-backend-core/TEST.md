# TEST: Agent mode: Translation API backend core

## Plan

| Level | Scope | Command | Result |
|-------|-------|---------|--------|
| unit | config, strategies, services, middleware, controllers | `python -m pytest services/translation_api/tests/ -v --tb=short` | 21/21 passed |

## Coverage (AC → Test)

| AC (REQ) | Test(s) | Status |
|----------|---------|--------|
| US-1 — POST /api/translation/translate returns 200 | `test_translate_endpoint` | ✅ |
| US-2 — POST /api/translation/translate/stream returns SSE | `test_translate_stream_endpoint` | ✅ |
| US-3 — 6 direction strategies routable | `test_direction_identifiers`, `test_dev_to_product_contains_developer_context`, `test_product_to_dev_contains_product_context`, `test_all_strategies_have_system_prompt` | ✅ |
| US-4 — GET /health, /ready, /live return 200 | `test_health_endpoint`, `test_ready_endpoint`, `test_live_endpoint` | ✅ |
| US-5 — Request-logging middleware | `test_response_time_header` (verifies X-Response-Time header) | ✅ |

## Results

```
21 passed in 0.48s
```

| Suite | Tests | Status |
|-------|-------|--------|
| test_config.py | 3/3 | ✅ |
| test_strategies.py | 5/5 | ✅ |
| test_services.py | 6/6 | ✅ |
| test_middleware.py | 1/1 | ✅ |
| test_controllers.py | 6/6 | ✅ |

- [x] all suites pass
- [x] no flaky tests

## 6-Dimensional Regression (T1–T6)

| Dimension | Check | Verdict |
|-----------|-------|---------|
| T1 意图 | Tests match US-1 through US-5 acceptance criteria | ✅ |
| T2 脆性 | No hardcoded paths/credentials in tests; env var with `setdefault` for CI | ✅ |
| T3 重复 | No duplicated test logic; shared fixtures in `conftest.py` | ✅ |
| T4 Mock | `AsyncMock` for LLM adapter isolates tests from real API | ✅ |
| T5 假象 | All tests run against real pydantic models/FastAPI app (not mocks of own code) | ✅ |
| T6 架构 | Adapter+Strategy layering validated: mock adapter → LLMService → TranslationService → controller | ✅ |

No dimension requires remediation (hit < 3).
