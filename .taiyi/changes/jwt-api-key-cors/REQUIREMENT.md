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
