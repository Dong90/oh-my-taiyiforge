# CONTEXT-COMPACT

> 自动压缩摘要 · 优先读此文件以降低 Token；细节见各工件原文件。

## CHANGE.md
# CHANGE: JWT 认证 + 请求限流 + API Key 管理 + CORS 优化

## Motivation
项目 README 安全机制评估中 API 认证、请求限流、API Key 管理、CORS 优化全部标记为待实现。翻译服务需要保护 API 不被滥用。

## Scope
- In:
  - JWT 认证中间件（FastAPI Depends）
  - Token 签发/验证 + refresh token
  - 请求限流中间件（令牌桶算法）
  - API Key 生成/管理接口
  - CORS 细粒度配置
- Out:
  - OAuth2 第三方登录
  - RBAC 权限系统

## Risks
- 依赖 data-layer 的 User 模型（user 表必须存在）
- 中间件注册顺序影响性能

## Success Criteria
- [ ] 未认证请求返回 401
- [ ] 登录接口返回 access + refresh token
- [ ] 超过限流的请求返回 429
- [ ] CORS 仅允许配置的域名

## REQUIREMENT.md
# REQUIREMENT: 安全机制

## 验收标准

### AC-01: 未认证请求返回 401
- Given: 无有效 token 的请求
- When: 访问任何 /api/v1/* 受保护端点
- Then: 返回 401 {"detail": "Not authenticated"}

### AC-02: 登录获取 token
- Given: 用户存在于数据库
- When: POST /api/v1/auth/login {username, password}
- Then: 返回 access_token + refresh_token + expires_in

### AC-03: 请求限流
- Given: 单 IP 在 1 分钟内超过 60 次请求
- When: 第 61 次请求
- Then: 返回 429 {"detail": "Too many requests"}

### AC-04: CORS 限制
- Given: CORS_ALLOWED_ORIGINS=["https://example.com"]
- When: 来自 https://attacker.com 的跨域请求
- Then: 浏览器拒绝访问

### AC-05: API Key 管理
- Given: 管理员用户
- When: POST /api/v1/api-keys 创建新 key
- Then: 返回 api_key + 可设过期时间

## DESIGN.md
# DESIGN: 安全机制（≥2 方案对比）

## 方案 A：python-jose + slowapi + CORS middleware
**技术选型**: python-jose（JWT）+ slowapi（限流）+ FastAPI CORSMiddleware

**架构**:
```
app/middleware/auth.py        → JWTAuthMiddleware (FastAPI Depends)
app/middleware/ratelimit.py   → slowapi limiter
app/routes/auth.py            → /api/v1/auth/login, /api/v1/api-keys
```

**优点**: 各库职责单一，组合灵活；slowapi 支持多种存储后端
**缺点**: 多个依赖，需协调版本兼容

## 方案 B：FastAPI Users + fastapi-limiter
**技术选型**: FastAPI Users（认证框架）+ fastapi-limiter

**优点**: FastAPI Users 开箱即用（注册/登录/密码重置）
**缺点**: FastAPI Users 耦合度高，定制困难

## 决策
选 **方案 A**。理由：
1. python-jose 是 JWT 标准实现，经过安全审计
2. slowapi 支持 Redis/Memory 后端，灵活切换
3. 组合式方案比框架式更可控
4. 每个库独立升级，降低风险

## TASK.md
# TASK: 安全机制

## Slices
| # | Slice | Depends | Done |
|---|-------|---------|------|
| 1 | JWT 认证中间件 | — | RED test green |
| 2 | /api/v1/auth/login 端点 | 1 | RED test green |
| 3 | 请求限流中间件 (slowapi) | — | RED test green |
| 4 | API Key 管理接口 | 1 | RED test green |
| 5 | CORS 细粒度配置 | — | RED test green |

## Checklist per Slice
- [ ] RED — 先写测试
- [ ] GREEN — 最小实现
- [ ] REFACTOR — 清理代码

## Dependencies & Risks
- 风险: 依赖 data-layer 的 User 模型（需 data-layer 先到 dev）
- 风险: main.py 被多 change 修改
- 阻塞项: 等 data-layer 完成 User 模型

## Non-goals
- OAuth2 第三方登录
- RBAC 细粒度权限
- SSO 单点登录

## TEST.md
# TEST: 安全机制

## 测试执行
```bash
cd examples/translation-assistant/agent/backend
pytest tests/ -v --cov=app/middleware/auth --cov=app/middleware/ratelimit --cov=app/controllers/auth_controller
```

## 证据摘要
| AC | 测试 | 结果 |
|----|------|------|
| AC-01 未认证返回 401 | test_auth_required.py | ✅ PASS |
| AC-02 登录返回 token | test_login.py | ✅ PASS |
| AC-03 限流返回 429 | test_rate_limit.py | ✅ PASS |
| AC-04 CORS 限制 | test_cors.py | ✅ PASS |
| AC-05 API Key 管理 | test_api_keys.py | ✅ PASS |

## 覆盖范围
- app/middleware/auth.py — JWT 认证
- app/middleware/ratelimit.py — slowapi 限流
- app/middleware/cors_config.py — CORS 配置
- app/controllers/auth_controller.py — 登录端点

## REVIEW.md
<!-- taiyi:seed-template -->

# REVIEW: JWT 认证 + 请求限流 + API Key 管理 + CORS 优化

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

## architecture-sync.md
# Architecture Sync: jwt-api-key-cors

## adr/001-design-decision.md
# ADR: python-jose + slowapi + CORSMiddleware

## 状态: 已提议

## 决策
采用 python-jose（JWT）+ slowapi（限流）+ FastAPI CORSMiddleware。

## 理由
- python-jose 是 JWT 标准实现，经过安全审计
- slowapi 支持多存储后端（Redis/Memory）
- 组合式方案比框架式更灵活可控
- 各库独立升级降低风险
