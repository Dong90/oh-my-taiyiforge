# CONTEXT-COMPACT

> 自动压缩摘要 · 优先读此文件以降低 Token；细节见各工件原文件。

## CHANGE.md
# CHANGE: 可观测性：Prometheus + OpenTelemetry + 日志聚合 + 异常告警

## Motivation
项目已有健康检查和基础指标，但缺少生产级可观测性。README 评估中 Prometheus metrics、OpenTelemetry 分布式追踪、日志聚合均待实现。

## Scope
- In:
  - Prometheus metrics 端点 + 指标收集
  - OpenTelemetry 分布式追踪集成
  - 结构化日志关联 trace_id
  - 异常监控计数器
- Out:
  - Grafana Dashboard 配置
  - ELK/Loki 部署

## Risks
- OpenTelemetry SDK 引入新依赖，需验证兼容性
- 修改 main.py 注册中间件，与其他 change 共享文件

## Success Criteria
- [ ] /metrics 端点输出 Prometheus 格式
- [ ] HTTP 请求自动生成 trace span
- [ ] 异常自动计数并暴露为 metric
- [ ] 日志包含 trace_id 关联

## REQUIREMENT.md
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

## DESIGN.md
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

## TASK.md
# TASK: 可观测性

## Slices
| # | Slice | Depends | Done |
|---|-------|---------|------|
| 1 | Prometheus metrics 中间件 + /metrics 端点 | — | RED test green |
| 2 | OpenTelemetry instrumentation | — | RED test green |
| 3 | 日志 trace_id 关联 | 2 | RED test green |
| 4 | 异常自动计数 metric | 1 | RED test green |

## Checklist per Slice
- [ ] RED — 先写测试
- [ ] GREEN — 最小实现
- [ ] REFACTOR — 清理代码

## Dependencies & Risks
- 风险: main.py 被多个 change 修改（与 api-swagger, jwt-api-key-cors 共享文件）
- 策略: 约定区域——各自在 main.py 中注册不重叠的中间件
- 阻塞项: 无上游依赖

## Non-goals
- Grafana Dashboard 配置
- ELK/Loki 日志聚合部署
- APM 服务端部署

## TEST.md
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

## REVIEW.md
<!-- taiyi:seed-template -->

# REVIEW: 可观测性：Prometheus + OpenTelemetry + 日志聚合 + 异常告警

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

## architecture-sync.md
# Architecture Sync: prometheus-opentelemetry

## adr/001-design-decision.md
# ADR: prometheus_client + OpenTelemetry SDK

## 状态: 已提议

## 决策
采用 prometheus_client（指标收集）+ OpenTelemetry SDK（分布式追踪）。

## 理由
- prometheus_client 是 CNCF 标准，Grafana 原生支持
- OpenTelemetry 是厂商中立的追踪标准
- Console exporter 适合开发，生产可切换 OTLP
- 两个库都有成熟的 FastAPI instrumentation 包
