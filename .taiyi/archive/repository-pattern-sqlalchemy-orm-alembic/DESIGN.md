# DESIGN: 数据层（≥2 方案对比）

## 方案 A：SQLAlchemy 2.0 async + Repository

**技术选型**: SQLAlchemy 2.0 async engine + async session + BaseRepository

**架构**:
```
app/repositories/base.py  → BaseRepository (CRUD 抽象)
app/models/db.py           → SQLAlchemy models (User, TranslationRecord)
app/db/session.py          → async session factory
alembic/                   → 迁移管理
```

**优点**: FastAPI 原生支持 async，与现有代码（uvicorn, httpx）一致
**缺点**: async ORM 调试较难，session 生命周期管理复杂

## 方案 B：Tortoise ORM + Pydantic

**技术选型**: Tortoise ORM（async-first, Django 风格）

**优点**: 代码更简洁，内置 Pydantic 集成
**缺点**: 社区较小，迁移工具不如 Alembic 成熟

## 决策

选 **方案 A**。理由：
1. SQLAlchemy 是 Python 生态最成熟的 ORM
2. Alembic 迁移工具经过大规模验证
3. 团队普遍熟悉 SQLAlchemy
4. async session 支持 FastAPI 的 async/await 范式
