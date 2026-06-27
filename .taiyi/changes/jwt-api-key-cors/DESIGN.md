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
