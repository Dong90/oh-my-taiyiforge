# ADR: redis-py + Celery with Redis broker

## 状态: 已提议

## 决策
采用 redis-py 做缓存层 + Celery 做异步任务队列（Redis broker）。

## 理由
- Redis 一石二鸟：缓存 + Celery broker
- Celery 是 Python 异步任务的事实标准
- 未来可扩展 Celery Beat 定时任务
- TTL 策略简单有效
