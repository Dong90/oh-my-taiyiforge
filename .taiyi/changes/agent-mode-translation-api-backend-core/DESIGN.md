# DESIGN: Agent mode: Translation API backend core

## Context

**Brownfield**: 当前代码库为 TaiyiForge（oh-my-taiyiforge）引擎本身，本 change 新增一个独立子目录 `services/translation-api/` 作为配套后端。不修改引擎核心代码。

**约束**:
- Python 3.11+ (pydantic-v2, FastAPI, httpx)
- SSE 流式响应（`text/event-stream`）
- 6 翻译方向：product↔dev, dev↔ops, product↔ops
- AI agent 模式：每个类需完整方法体 + 异常处理 + logger，非骨架模板
- 禁止引入新库（只用标准依赖：fastapi, uvicorn, pydantic, httpx, openai）

## Options

| Option | Summary | Pros | Cons | Cost |
|--------|---------|------|------|------|
| A | Adapter + Strategy 分层 | LLMAdapter 抽象 + OpenAIAdapter 实现；6 Strategy 子类 + Factory 分发 | 独立测试每层；Adapter 可替换；新增方向只需加子类 | 文件较多（≈12），小项目 over-engineering | ~350 LOC |
| B | 单 Service + 配置驱动 | 一个类用 dict 映射方向→prompt；调用 OpenAI SDK 直接翻译 | 文件少（≈3），定位快 | 方向增多 service 膨胀；无法独立测试；切换 LLM 需改代码 | ~200 LOC |

## Decision

**Chosen:** Option A — Adapter + Strategy 分层

**Reason:**

1. **Agent 模式目标**：change 标题明确为 "Agent mode"——AI agent 生成真实代码而非骨架。分层架构产出更有教育意义和可维护性的代码。
2. **测试解耦**：Option A 允许对每个 Strategy 子类单独写 `pytest` 测试（mock adapter），Option B 只能端到端测试。
3. **未来扩展**：manifest 已规划后续 change 包含 `more-llm-adapters`（添加 Claude/Gemini），Option A 的 Adapter 抽象直接支持。
4. **取舍代价**：Option A 多 ~150 LOC，但这是结构化的合理增长（manifest 中 M1-M17 已分好模块，agent 按模块生成即可）。

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Application                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Middleware Chain                        │  │
│  │  RequestLogger → ErrorHandler → ResponseTimeMetrics │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │              TranslationController                   │  │
│  │  POST /translate  →  POST /translate/stream         │  │
│  └──────────────────────┬─────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼─────────────────────────────┐  │
│  │              TranslationService                      │  │
│  │  Factory: from_role + to_role → Strategy            │  │
│  └──┬──────────────────────────────────┬───────────────┘  │
│     │                                  │                   │
│  ┌──▼──────────┐           ┌───────────▼──────────────┐   │
│  │  6 Strategy │           │       LLMService          │   │
│  │  Subclasses │           │  translate(prompt) → str  │   │
│  └─────────────┘           └───────────┬──────────────┘   │
│                                        │                   │
│  ┌─────────────────────────────────────▼──────────────┐   │
│  │              LLMAdapter (Abstract)                  │   │
│  │         OpenAIAdapter  (Concrete)                   │   │
│  │         chat_completion(messages) → str             │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

     Legend:
     ─→  Synchronous call / dependency injection
```

**Data flow — Non-streaming**:
```
Request → Middleware → Controller → TranslationService
  → TranslationService._select_strategy(from_role, to_role)
  → DevToProductStrategy.build_prompt(text)
  → LLMService.translate(prompt)
  → OpenAIAdapter.chat_completion(messages)
  → LLMService → TranslationService → Controller → Response
```

**Data flow — Streaming**:
```
Request → Controller → TranslationService
  → _select_strategy → build_prompt
  → LLMService.translate_stream(prompt)
  → OpenAIAdapter.chat_completion_stream(messages) → async generator
  → Controller iterates → yields SSE events
```

## Module layout

```
services/translation-api/
├── app.py                    # FastAPI app factory + lifespan
├── config.py                 # pydantic-settings (M16)
├── models/
│   ├── __init__.py
│   └── schemas.py            # Request/Response Pydantic models
├── adapters/
│   ├── __init__.py
│   ├── base.py               # LLMAdapter ABC (M1)
│   └── openai.py             # OpenAIAdapter (M2)
├── strategies/
│   ├── __init__.py
│   ├── base.py               # TranslationStrategy ABC (M3)
│   ├── dev_to_product.py     # (M4)
│   ├── product_to_dev.py     # (M5)
│   ├── dev_to_ops.py         # (M6)
│   ├── ops_to_dev.py         # (M7)
│   ├── product_to_ops.py     # (M8)
│   └── ops_to_product.py     # (M9)
├── services/
│   ├── __init__.py
│   ├── translation_service.py # Factory + orchestration (M10)
│   └── llm_service.py         # Wraps adapter (M11)
├── controllers/
│   ├── __init__.py
│   └── translation_controller.py # (M12)
├── middleware/
│   ├── __init__.py
│   ├── request_logger.py      # (M13)
│   ├── error_handler.py       # (M14)
│   └── response_time.py       # (M15)
└── tests/
    ├── __init__.py
    ├── test_adapters.py
    ├── test_strategies.py
    ├── test_services.py
    ├── test_controllers.py
    └── conftest.py
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OpenAI API key 未配置导致启动后运行时错误 | config.py 启动时校验 `OPENAI_API_KEY`，缺失时早失败 |
| SSE 流式被 nginx/caddy 缓冲 | 响应头加 `X-Accel-Buffering: no` + `Cache-Control: no-cache` |
| 6 策略子类新增方向需改 factory | factory 用注册表模式，新增方向只加注册行不改 factory 逻辑 |
| LLM 返回格式异常 | LLMService 加 fallback 重试 + 响应格式校验 |

## Open Questions

- [x] API 端口固定 8000 或可配置？ → 可配置（config.py）
- [x] 日志写入文件还是 stdout？ → stdout（docker-friendly）
- [x] OpenAI 模型固定或可配置？ → 可配置（默认 gpt-4o-mini）

## Verification Checklist

| # | Check | Method | Links to REQUIREMENT |
|---|-------|--------|---------------------|
| 1 | `POST /api/translation/translate` returns 200 with translated JSON | `pytest tests/test_controllers.py -k test_translate_sync` | US-1 AC |
| 2 | `POST /api/translation/translate/stream` returns `text/event-stream` | `pytest tests/test_controllers.py -k test_translate_stream` | US-2 AC |
| 3 | All 6 strategies produce different prompts when `build_prompt()` called | `pytest tests/test_strategies.py -v` | US-3 AC |
| 4 | `GET /health` returns 200 + `{"status":"ok"}` | `pytest tests/test_controllers.py -k test_health` | US-4 AC |
| 5 | Request middleware logs method + path + duration | `pytest tests/test_middleware.py -k test_logger` | US-5 AC |
| 6 | Missing `OPENAI_API_KEY` raises `ConfigError` at startup | `pytest tests/test_config.py -k test_missing_key` | Design Risk #1 |
| 7 | Unknown direction pair raises 400 with clear message | `pytest tests/test_services.py -k test_unknown_direction` | US-3 edge case |
