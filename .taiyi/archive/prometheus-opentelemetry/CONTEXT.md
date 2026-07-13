# CONTEXT: prometheus-opentelemetry

> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要

为 translation-assistant 添加 Prometheus metrics + OpenTelemetry 分布式追踪。

## 相关目录

| 路径 | 关系 | 备注 |
|------|------|------|
| examples/translation-assistant/agent/backend/app/middleware/ | 必读 | 现有中间件实现 |
| examples/translation-assistant/agent/backend/app/main.py | 必读 | 中间件注册入口 |
| examples/translation-assistant/agent/backend/app/controllers/metrics_controller.py | 必读 | 现有指标端点 |
| examples/translation-assistant/agent/backend/app/core/logger.py | 参考 | 结构化日志 |

## 模式清单

- 中间件：logging_middleware, error_handler, timing_middleware
- 指标：MetricsService 已有翻译统计
- 日志：JSON 格式，含 request_id
- 健康检查：/health, /ready, /live 端点

## 风险区

| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| MEDIUM | main.py | 多 change 修改同一文件 | 约定区域策略，各自注册不重叠的中间件 |

## Read First

1. examples/translation-assistant/agent/backend/app/main.py — 中间件注册位置
2. examples/translation-assistant/agent/backend/app/controllers/metrics_controller.py — 现有指标
3. examples/translation-assistant/README.md §监控和可观测性 — TODO

## Handoff

- change：Scope 为 metrics + tracing，不改业务逻辑
- design：需决策 OpenTelemetry exporter（Console/OTLP/Jaeger）
