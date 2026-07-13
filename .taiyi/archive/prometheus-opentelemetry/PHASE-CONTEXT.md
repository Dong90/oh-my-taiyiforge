<!-- 项目级上下文 · 来自 taiyi-intel-scan · 引擎自动维护 -->
## Project Context

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

<!-- PROJECT-CONTEXT-END -->
# Change Graph: prometheus-opentelemetry

## Phases
### change (4 nodes)
**acceptance_criterion** (4)
  - /metrics 端点输出 Prometheus 格式
  - HTTP 请求自动生成 trace span
  - 异常自动计数并暴露为 metric
  - ... +1 more

### design (1 nodes)
**design_decision** (1) A

### task (4 nodes)
**slice** (4)
  - slice-1
  - slice-2
  - slice-3
  - ... +1 more

## Cross-Cutting Concerns
**1** SSOT violations: 0 high, 0 medium, 1 low
- [LOW] design_decision (design vs task): 设计决策跨阶段不一致: "A" ≠ "slice-1"

## Stats
- Total nodes: 9
- Total edges: 4
- Phases with nodes: 3/8


## review (✓)
**评审**: REVIEW


---

**当前**: integration · Skill: @taiyi-integration · 工件: INTEGRATION.md
**复杂度**: low | Profile: api
**下一步**: 加载 @taiyi-integration，编辑 INTEGRATION.md

*引擎生成 · Agent 读此文件即可*

<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。
     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->