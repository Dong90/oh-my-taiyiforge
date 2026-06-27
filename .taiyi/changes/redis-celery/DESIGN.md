# DESIGN: 缓存与异步队列（≥2 方案对比）

## 方案 A：redis-py + Celery with Redis broker

**技术选型**: redis-py（缓存）+ Celery（异步任务，Redis broker）

**架构**:
```
app/cache/redis_cache.py    → @cached 装饰器，TTL 失效
app/tasks/translation.py    → Celery task 定义
celery_app.py               → Celery 实例配置
```

**优点**: Celery 是 Python 异步任务事实标准，Redis 同时做缓存和 broker
**缺点**: Celery 较重，需要 worker 进程管理

## 方案 B：aiocache + arq

**技术选型**: aiocache（缓存）+ arq（轻量异步队列，Redis-based）

**优点**: arq 更轻量，纯 async，与 FastAPI 一致
**缺点**: arq 功能不如 Celery 丰富（无定时任务、无复杂路由）

## 决策

选 **方案 A**。理由：
1. Celery 社区大，文档全，问题好排查
2. Redis 一石二鸟（缓存 + broker），减少依赖
3. 未来如需定时任务可直接用 Celery Beat
