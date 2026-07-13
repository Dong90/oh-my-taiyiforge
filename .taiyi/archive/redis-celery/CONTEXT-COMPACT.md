# CONTEXT-COMPACT

> 自动压缩摘要 · 优先读此文件以降低 Token；细节见各工件原文件。

## CHANGE.md
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
- [ ] 相同翻译请求第二次命中缓存
- [ ] 数据库连接池正常工作
- [ ] Celery worker 可接收并执行异步任务

## REQUIREMENT.md
# REQUIREMENT: 缓存与异步队列

## 验收标准

### AC-01: 翻译结果缓存命中
- Given: 首次请求 product_to_dev "需要一个推荐功能" 完成翻译
- When: 再次请求相同方向和相同输入
- Then: 返回缓存结果，不调用 LLM API

### AC-02: 数据库连接池
- Given: settings.py 配置了连接池参数
- When: 启动应用并处理并发请求
- Then: 连接数不超过配置的 pool_size

### AC-03: Celery 异步任务
- Given: Redis broker 运行中
- When: 提交一个异步翻译任务
- Then: Celery worker 接收并执行，结果可通过 task_id 查询

## DESIGN.md
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

## TASK.md
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

## TEST.md
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

## REVIEW.md
<!-- taiyi:seed-template -->

# REVIEW: 性能优化：Redis 缓存 + 连接池 + Celery 异步任务队列

## Findings
| Severity | File | Issue | Fix |
|----------|------|-------|-----|
| high | | | |
| medium | | | |
| low | | | |

## Security
- [ ] auth / input validation
- [ ] no hardcoded secrets

## Verdict
- [ ] **Approve**
- [ ] **Request changes** — blocked:

## CONTEXT.md
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

## architecture-sync.md
# Architecture Sync: redis-celery

## adr/001-design-decision.md
# ADR: redis-py + Celery with Redis broker

## 状态: 已提议

## 决策
采用 redis-py 做缓存层 + Celery 做异步任务队列（Redis broker）。

## 理由
- Redis 一石二鸟：缓存 + Celery broker
- Celery 是 Python 异步任务的事实标准
- 未来可扩展 Celery Beat 定时任务
- TTL 策略简单有效
