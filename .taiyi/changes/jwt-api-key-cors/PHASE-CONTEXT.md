<!-- 项目级上下文 · 来自 taiyi-intel-scan · 引擎自动维护 -->
## Project Context

# CONTEXT: jwt-api-key-cors

> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要

为 translation-assistant 添加 JWT 认证、请求限流、API Key 管理和 CORS 细粒度配置。

## 相关目录

| 路径 | 关系 | 备注 |
|------|------|------|
| examples/translation-assistant/agent/backend/app/main.py | 必读 | 中间件注册入口 |
| examples/translation-assistant/agent/backend/app/middleware/ | 必读 | 现有中间件模式 |
| examples/translation-assistant/agent/backend/app/config/settings.py | 必读 | 配置入口 |

## 模式清单

- 中间件：LoggingMiddleware, ErrorHandlerMiddleware, TimingMiddleware
- 配置：pydantic-settings BaseSettings
- 依赖注入：FastAPI Depends
- CORS：当前 allow_origins=["*"]

## 风险区

| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| HIGH | 依赖 data-layer | 需要 User 模型，data-layer 必须先完成 | Wave 2 排队 |
| MEDIUM | main.py | 与其他 change 共享 | 约定区域 |

## Read First

1. examples/translation-assistant/agent/backend/app/main.py
2. examples/translation-assistant/agent/backend/app/middleware/
3. examples/translation-assistant/README.md §安全机制

## Handoff

- change：Scope 为 JWT + 限流 + CORS
- design：JWT 方案 (python-jose vs PyJWT)、限流策略 (token bucket vs sliding window)

<!-- PROJECT-CONTEXT-END -->
# Change Graph: jwt-api-key-cors

## Phases
### change (4 nodes)
**acceptance_criterion** (4)
  - 未认证请求返回 401
  - 登录接口返回 access + refresh token
  - 超过限流的请求返回 429
  - ... +1 more

### design (1 nodes)
**design_decision** (1) (empty)

## Stats
- Total nodes: 5
- Total edges: 0
- Phases with nodes: 2/8


## requirement (✓)


---

**当前**: design · Skill: @taiyi-design · 工件: DESIGN.md
**复杂度**: low | Profile: api
**下一步**: /taiyi:continue --approver "你的名字"

*引擎生成 · Agent 读此文件即可*

<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。
     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->