# REQUIREMENT: API 规范化

## 验收标准

### AC-01: Swagger UI 可访问
- Given: 服务运行中
- When: 访问 GET /docs
- Then: 显示完整的 Swagger UI，列出所有 API 端点

### AC-02: API 版本化路径
- Given: 服务运行中
- When: POST /api/v1/translation/translate
- Then: 正常返回翻译结果，旧路径返回 deprecation warning

### AC-03: 配置热加载
- Given: 服务运行中
- When: 修改 .env 中的 LOG_LEVEL=DEBUG
- Then: 无需重启，日志级别自动切换为 DEBUG

### AC-04: 输入验证增强
- Given: 服务运行中
- When: 发送缺少必填字段 text 的请求
- Then: 返回 422 和结构化错误
