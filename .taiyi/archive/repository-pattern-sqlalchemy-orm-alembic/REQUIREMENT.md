# REQUIREMENT: 数据层

## 验收标准

### AC-01: SQLAlchemy 模型可创建/查询
- Given: 项目已配置数据库连接
- When: 调用 User.create(name="test", email="test@example.com")
- Then: 可通过 User.get_by_email("test@example.com") 查询到该记录

### AC-02: Alembic 迁移正常运行
- Given: 存在至少一个模型定义
- When: 执行 alembic revision --autogenerate -m "init" 然后 alembic upgrade head
- Then: 数据库表成功创建

### AC-03: Repository 抽象基类可用
- Given: 任意模型继承 BaseRepository
- When: 调用 repo.create(), repo.get_by_id(), repo.list()
- Then: CRUD 操作正确执行

### AC-04: 连接池配置生效
- Given: settings.py 中配置 pool_size=10
- When: 启动应用
- Then: SQLAlchemy engine 使用 pool_size=10
