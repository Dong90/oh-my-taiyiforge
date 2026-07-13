# DESIGN: 可观测性（≥2 方案对比）

## 方案 A：prometheus_client + opentelemetry-instrumentation-fastapi

**技术选型**: prometheus_client（指标）+ opentelemetry SDK（追踪）+ Console exporter

**架构**:
```
app/middleware/metrics.py     → PrometheusMetricsMiddleware
app/telemetry/tracing.py      → OpenTelemetry setup
loguru / structlog             → 结构化日志 + trace_id
```

**优点**: 标准化方案，与 FastAPI 生态集成好，Console exporter 零配置
**缺点**: 两个独立库，需手动关联 trace_id 到日志

## 方案 B：django-prometheus + Sentry

**技术选型**: Sentry SDK（错误追踪 + 性能）+ django-prometheus

**优点**: 一键集成，Sentry 提供托管 Dashboard
**缺点**: 不适合非 Django 项目（本项目是 FastAPI），Sentry 有成本

## 决策

选 **方案 A**。理由：
1. prometheus_client 是 CNCF 标准
2. OpenTelemetry 是厂商中立追踪标准
3. Console exporter 适合本地开发，生产可无缝切 OTLP
4. 两个库都在 FastAPI 有成熟的 instrumentation 包
