# ADR: SQLAlchemy 2.0 async + Repository Pattern

## 状态: 已提议

## 决策
采用 SQLAlchemy 2.0 async engine + Repository Pattern 作为数据层。

## 理由
- SQLAlchemy 是 Python 生态最成熟的 ORM
- Alembic 迁移工具经过大规模生产验证
- async session 与 FastAPI 的 async/await 范式一致
- Repository Pattern 隔离业务逻辑与数据访问
