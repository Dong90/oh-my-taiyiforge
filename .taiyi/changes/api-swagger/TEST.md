# TEST: API 规范化

## 测试执行

```bash
cd examples/translation-assistant/agent/backend
pytest tests/ -v --cov=app/controllers/v1 --cov=app/models
```

## 证据摘要

| AC | 测试 | 结果 |
|----|------|------|
| AC-01 Swagger /docs 可访问 | test_swagger_docs.py | ✅ PASS |
| AC-02 API v1 版本化路径 | test_v1_routes.py | ✅ PASS |
| AC-03 配置热加载 | test_hotreload.py | ✅ PASS |
| AC-04 输入验证增强 | test_validation.py | ✅ PASS |

## 覆盖范围
- app/controllers/v1/ — 版本化路由
- app/models/validation.py — 增强验证
- app/config/hotreload.py — 热加载
