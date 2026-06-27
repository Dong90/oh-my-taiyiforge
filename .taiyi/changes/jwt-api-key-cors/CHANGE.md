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
