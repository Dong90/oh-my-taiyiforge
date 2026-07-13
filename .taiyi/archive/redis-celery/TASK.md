# TASK: 缓存与异步队列

## Slices
| # | Slice | Depends | Done |
|---|-------|---------|------|
| 1 | Redis 连接 + 缓存装饰器 | — | RED test green |
| 2 | 翻译结果缓存集成 | 1 | RED test green |
| 3 | Celery 配置 + worker | — | RED test green |
| 4 | 异步翻译任务 | 3 | RED test green |

## Checklist per Slice
- [ ] RED — 先写测试
- [ ] GREEN — 最小实现
- [ ] REFACTOR — 清理代码

## Dependencies & Risks
- 风险: 需要 Redis 实例（docker-compose 中添加）
- 风险: settings.py 被多 change 共享（与 api-swagger 等）
- 阻塞项: 无上游依赖

## Non-goals
- 读写分离 / 数据分片
- RabbitMQ / Kafka 替代方案
- 分布式锁
