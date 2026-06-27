# CHANGE: 数据层：Repository Pattern + SQLAlchemy ORM + Alembic 迁移 + 数据模型

## Motivation

translation-assistant 项目当前无持久化层。README 评估中「数据持久化」全部标记为待实现。需要引入 ORM、Repository 模式和数据迁移管理，为后续功能（用户认证、翻译历史）打基础。

## Scope

- In:
  - 引入 SQLAlchemy ORM
  - 实现 Repository Pattern 抽象层
  - 配置 Alembic 迁移管理
  - 设计核心数据模型（User, TranslationRecord）
  - 数据库连接池配置
- Out:
  - 具体业务查询逻辑
  - Redis 缓存

## Risks

- 数据模型设计影响后续所有功能，需谨慎
- 与现有代码无冲突（新增模块），低风险

## Success Criteria

- [ ] SQLAlchemy 模型可在 pytest 中创建/查询
- [ ] Alembic migration 可正常运行
- [ ] Repository 基类抽象可用
- [ ] 数据库连接池配置生效
