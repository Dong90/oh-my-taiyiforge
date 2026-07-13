# TASK: Agent mode: Translation API backend core

## Slices (vertical, smallest shippable first)

| # | Slice | Depends | Done when |
|---|-------|---------|-----------|
| 1 | T01: Config + Pydantic schemas | — | `pytest tests/ -k config` passes; `OPENAI_API_KEY` missing raises ConfigError |
| 2 | T02: LLMAdapter base + OpenAIAdapter | T01 | `pytest tests/ -k adapter` passes with mocked httpx |
| 3 | T03: TranslationStrategy base + 6 subclasses | T01 | `pytest tests/ -k strategy` passes; 6 strategies return different prompts |
| 4 | T04: LLMService | T02 | `pytest tests/ -k llm_service` passes; wraps adapter with fallback |
| 5 | T05: TranslationService factory | T03+T04 | `pytest tests/ -k translation_service` passes; unknown direction raises 400 |
| 6 | T06: Middleware chain | T01 | `pytest tests/ -k middleware` passes; logger/error/time all wired |
| 7 | T07: Controller + app factory | T05+T06 | `pytest tests/ -k controller` passes; `/health` returns 200 |
| 8 | T08: Integration smoke test | T07 | `pytest tests/ -v` all green; server starts and responds |

## Checklist per slice

- [ ] 测试先行（RED）— 先写测试，验证失败
- [ ] 最小实现（GREEN）— 实现通过测试
- [ ] 重构（REFACTOR）— 清理实现
- [ ] 更新追溯（REQUIREMENT AC）— DESIGN.md Verification Checklist 逐项标记

## Wave plan

```
Wave1: T01[P] T02[P]          (parallel — no deps)
Wave2: T03[P] T04[P]           (parallel — T03→T01, T04→T02)
Wave3: T05                     (serial — T05→T03+T04)
Wave4: T06[P] T07              (T06→T01, T07→T05+T06)
Wave5: T08                     (serial — all slices complete)
```

## Non-goals (this change)

- Docker 镜像和 docker-compose.yml
- 前端 UI 界面
- JWT 认证中间件
- 数据库持久化
- CI/CD pipeline
- 多 LLM 适配器（Claude/Gemini）
