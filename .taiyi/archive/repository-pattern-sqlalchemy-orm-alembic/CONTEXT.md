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
