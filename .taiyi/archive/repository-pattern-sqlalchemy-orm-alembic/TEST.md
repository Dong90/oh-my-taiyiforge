# TEST: 数据层

## 测试执行

```bash
cd examples/translation-assistant/agent/backend
pytest tests/ -v --cov=app/db --cov=app/repositories --cov=app/models
```

## 证据摘要

| AC | 测试 | 结果 |
|----|------|------|
| AC-01 SQLAlchemy 模型创建/查询 | test_db_models.py | ✅ PASS |
| AC-02 Alembic 迁移 | test_migration.py | ✅ PASS |
| AC-03 Repository CRUD | test_repository.py | ✅ PASS |
| AC-04 连接池配置 | test_engine.py | ✅ PASS |

## 覆盖范围
- app/db/engine.py — 引擎 + session 工厂
- app/repositories/base.py — CRUD 抽象
- app/models/db_models.py — User + TranslationRecord
- alembic/ — 迁移配置
