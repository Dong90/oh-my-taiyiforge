# TASK: API 规范化

## Slices
| # | Slice | Depends | Done |
|---|-------|---------|------|
| 1 | API 版本化路由 (/api/v1/*) | — | RED test green |
| 2 | Swagger/ReDoc 文档完善 | 1 | RED test green |
| 3 | 配置热加载 (watchfiles) | — | RED test green |
| 4 | Pydantic 输入验证增强 | 1 | RED test green |

## Checklist per Slice
- [ ] RED — 先写测试
- [ ] GREEN — 最小实现
- [ ] REFACTOR — 清理代码

## Dependencies & Risks
- 风险: controllers/ 下多个文件需修改，版本化路由需向后兼容
- 风险: main.py 被多 change 修改（与 observability, security 共享）
- 阻塞项: 无上游依赖

## Non-goals
- API 限流策略（归 jwt-api-key-cors）
- API 认证（归 jwt-api-key-cors）
- GraphQL 端点
