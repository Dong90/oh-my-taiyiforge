# TEST: 可观测性

## 测试执行

```bash
cd examples/translation-assistant/agent/backend
pytest tests/ -v --cov=app/telemetry
```

## 证据摘要

| AC | 测试 | 结果 |
|----|------|------|
| AC-01 Prometheus /metrics 端点 | test_metrics_endpoint.py | ✅ PASS |
| AC-02 OpenTelemetry trace span | test_tracing.py | ✅ PASS |
| AC-03 异常自动计数 | test_error_metrics.py | ✅ PASS |
| AC-04 日志 trace_id 关联 | test_trace_id.py | ✅ PASS |

## 覆盖范围
- app/telemetry/metrics.py — Prometheus 中间件 + 端点
- app/telemetry/tracing.py — OpenTelemetry 配置
