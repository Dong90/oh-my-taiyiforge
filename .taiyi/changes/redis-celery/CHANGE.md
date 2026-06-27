# CHANGE: 性能优化：Redis 缓存 + 连接池 + Celery 异步任务队列

## Motivation

项目当前无缓存层和异步任务支持。README 评估中响应缓存、连接池管理、异步任务队列全部待实现。翻译请求调用外部 LLM API，缓存可显著减少重复调用成本。

## Scope

- In:
  - Redis 缓存集成
  - LLM 翻译结果缓存（TTL 策略）
  - 数据库连接池优化
  - Celery 异步任务队列
- Out:
  - 读写分离、数据分片
  - RabbitMQ/Kafka

## Risks

- Redis 是新依赖，需要 Docker Compose 配合
- Celery 需要 broker（Redis），增加运维复杂度

## Success Criteria

- [x] 相同翻译请求第二次命中缓存
- [x] 数据库连接池正常工作
- [x] Celery worker 可接收并执行异步任务
