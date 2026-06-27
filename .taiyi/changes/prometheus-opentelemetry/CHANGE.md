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
