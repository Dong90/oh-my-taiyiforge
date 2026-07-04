# CONTEXT-COMPACT

> 自动压缩摘要 · 优先读此文件以降低 Token；细节见各工件原文件。

## CHANGE.md
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

## REQUIREMENT.md
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

## DESIGN.md
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

## TASK.md
# TASK: 数据层

## Slices
| # | Slice | Depends | Done |
|---|-------|---------|------|
| 1 | SQLAlchemy engine + session 配置 | — | RED test green |
| 2 | BaseRepository 抽象基类 | 1 | RED test green |
| 3 | User 数据模型 | 1 | RED test green |
| 4 | TranslationRecord 数据模型 | 1 | RED test green |
| 5 | Alembic 迁移配置 + 初始 migration | 1,3,4 | RED test green |

## Checklist per Slice
- [ ] RED — 先写测试
- [ ] GREEN — 最小实现
- [ ] REFACTOR — 清理代码

## Dependencies & Risks
- 风险: 数据模型设计影响 jwt-api-key-cors（User 表），需保持接口稳定
- 阻塞项: 无上游依赖，可独立推进

## Non-goals
- 具体业务查询逻辑（留给上层 service）
- 数据库运维脚本（备份/恢复）
- 读写分离 / 数据分片

## TEST.md
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

## REVIEW.md
<!-- taiyi:seed-template -->

# REVIEW: 数据层：Repository Pattern + SQLAlchemy ORM + Alembic 迁移 + 数据模型

## Findings
| Severity | File | Issue | Fix |
|----------|------|-------|-----|
| high | | | |
| medium | | | |
| low | | | |

## Security
- [ ] auth / input validation
- [ ] no hardcoded secrets

## Verdict
- [ ] **Approve**
- [ ] **Request changes** — blocked:

## CONTEXT.md
# CONTEXT: repository-pattern-sqlalchemy-orm-alembic
> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要
为 translation-assistant 引入数据持久化层：SQLAlchemy ORM + Repository Pattern + Alembic 迁移。

## 相关目录
| 路径 | 关系 | 备注 |
|------|------|------|
| examples/translation-assistant/agent/backend/app/ | 必读 | 现有后端代码结构 |
| examples/translation-assistant/agent/backend/app/config/settings.py | 必读 | 数据库连接配置入口 |
| examples/translation-assistant/agent/backend/app/core/ | 参考 | 日志、异常处理 |

## 模式清单
- 框架：FastAPI + pydantic-settings
- 配置：settings.py 中的 Settings 类
- 异常：自定义 TranslationException
- 依赖注入：FastAPI Depends

## 风险区
| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| LOW | 新增模块 | 全新代码，无冲突 | — |

## Read First
1. examples/translation-assistant/agent/backend/app/config/settings.py — 了解配置模式
2. examples/translation-assistant/agent/backend/app/main.py — FastAPI 启动入口
3. examples/translation-assistant/README.md §数据持久化 — TODO 清单

## Handoff
- change：Scope 为 ORM + Repository + 迁移，建立数据层基础
- design：需决策：同步 vs 异步 ORM、Repository 接口设计

## architecture-sync.md
# Architecture Sync: repository-pattern-sqlalchemy-orm-alembic

## adr/001-design-decision.md
# ADR: SQLAlchemy 2.0 async + Repository Pattern

## 状态: 已提议

## 决策
采用 SQLAlchemy 2.0 async engine + Repository Pattern 作为数据层。

## 理由
- SQLAlchemy 是 Python 生态最成熟的 ORM
- Alembic 迁移工具经过大规模生产验证
- async session 与 FastAPI 的 async/await 范式一致
- Repository Pattern 隔离业务逻辑与数据访问
