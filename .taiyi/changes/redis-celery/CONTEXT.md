# CONTEXT: redis-celery

> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要

为 translation-assistant 添加 Redis 缓存和 Celery 异步任务队列。

## 相关目录

| 路径 | 关系 | 备注 |
|------|------|------|
| examples/translation-assistant/agent/backend/app/services/ | 必读 | LLM 服务、翻译服务 |
| examples/translation-assistant/agent/backend/app/adapters/ | 必读 | OpenAI 适配器 |
| examples/translation-assistant/agent/backend/app/config/settings.py | 必读 | 配置入口 |

## 模式清单

- LLM 调用：OpenAIAdapter.chat_completion()
- 翻译流程：TranslationService → Strategy → Adapter
- 配置：pydantic-settings，环境变量优先

## 风险区

| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| MEDIUM | settings.py | 多 change 共享配置 | 各自追加配置项 |
| LOW | services/ | 新增缓存装饰器，不改核心逻辑 | — |

## Read First

1. examples/translation-assistant/agent/backend/app/services/translation_service.py — 翻译核心
2. examples/translation-assistant/agent/backend/app/services/llm_service.py — LLM 调用
3. examples/translation-assistant/agent/backend/app/config/settings.py — 配置

## Handoff

- change：Scope 为缓存 + 异步队列，不改变翻译逻辑
- design：缓存策略（per-direction + input hash 还是 per-request）
