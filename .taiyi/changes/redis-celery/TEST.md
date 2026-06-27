# TEST: 缓存与异步队列

## 测试执行

```bash
cd examples/translation-assistant/agent/backend
pytest tests/ -v --cov=app/cache --cov=app/tasks
```

## 证据摘要

| AC | 测试 | 结果 |
|----|------|------|
| AC-01 翻译结果缓存命中 | test_cache_hit.py | ✅ PASS |
| AC-02 数据库连接池 | test_pool_size.py | ✅ PASS |
| AC-03 Celery worker 执行任务 | test_celery_task.py | ✅ PASS |

## 覆盖范围
- app/cache/redis_cache.py — Redis 缓存 + @cached 装饰器
- app/tasks/celery_app.py — Celery 配置
- app/tasks/translation.py — 异步翻译任务
