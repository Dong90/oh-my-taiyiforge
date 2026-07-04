# ADR: prometheus_client + OpenTelemetry SDK

## 状态: 已提议

## 决策
采用 prometheus_client（指标收集）+ OpenTelemetry SDK（分布式追踪）。

## 理由
- prometheus_client 是 CNCF 标准，Grafana 原生支持
- OpenTelemetry 是厂商中立的追踪标准
- Console exporter 适合开发，生产可切换 OTLP
- 两个库都有成熟的 FastAPI instrumentation 包
