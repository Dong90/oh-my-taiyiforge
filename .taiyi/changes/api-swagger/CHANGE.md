# CHANGE: API 完善：版本化 + Swagger 文档 + 配置热加载 + 输入验证

## Motivation

项目 API 缺少版本管理、OpenAPI 文档不完善、配置不支持热加载。README 评估中这些项均标记为待实现。API 版本化是 API 演进的必要基础。

## Scope

- In:
  - API 路径版本化（/api/v1/...）
  - Swagger/ReDoc 文档完善
  - 配置热加载支持
  - 输入验证增强
- Out:
  - API 限流策略
  - API 认证

## Risks

- API 版本化涉及路径变更，需确保向后兼容
- main.py 被多个 change 修改，需约定区域策略

## Success Criteria

- [x] Swagger UI 在 /docs 可访问
- [x] /api/v1/translation/translate 路径可用
- [x] 配置修改后无需重启即可生效
- [x] 输入验证拒绝非法请求并返回结构化错误
