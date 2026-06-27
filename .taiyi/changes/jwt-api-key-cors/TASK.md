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
