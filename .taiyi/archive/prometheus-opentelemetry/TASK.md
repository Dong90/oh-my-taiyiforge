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
