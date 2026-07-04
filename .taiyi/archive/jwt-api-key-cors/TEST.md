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
