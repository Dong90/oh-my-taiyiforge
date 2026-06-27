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
<!-- taiyi:seed-template -->

# DESIGN: JWT 认证 + 请求限流 + API Key 管理 + CORS 优化

## Options
| Option | Summary | Pros | Cons | Cost |
|--------|---------|------|------|------|
| A | | | | |
| B | | | | |

## Decision
**Chosen:** Option …
**Reason:** …

## Architecture
```text
[data flow / components]
```

## Risks
| Risk | Mitigation |
|------|------------|
| | |

## Open
- [ ] …

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
