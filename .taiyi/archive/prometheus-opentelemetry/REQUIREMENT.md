# REQUIREMENT: 可观测性

## 验收标准

### AC-01: Prometheus 指标端点
- Given: 服务运行中
- When: GET /metrics
- Then: 返回 Prometheus 格式指标 http_requests_total, http_request_duration_seconds

### AC-02: OpenTelemetry Trace
- Given: 服务运行中
- When: 发送任意 HTTP 请求
- Then: 生成完整 trace span 含 method, path, status_code

### AC-03: 异常自动计数
- Given: 服务运行中
- When: 任意请求抛出 5xx 异常
- Then: http_errors_total metric 自增

### AC-04: 日志 trace_id 关联
- Given: OpenTelemetry 已启用
- When: 任意请求生成日志
- Then: 日志 JSON 中包含 trace_id 字段
