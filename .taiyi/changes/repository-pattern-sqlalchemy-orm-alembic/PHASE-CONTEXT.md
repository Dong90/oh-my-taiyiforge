<!-- 项目级上下文 · 来自 taiyi-intel-scan · 引擎自动维护 -->
## Project Context

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

<!-- PROJECT-CONTEXT-END -->
# Change Graph: repository-pattern-sqlalchemy-orm-alembic

## Phases
### change (4 nodes)
**acceptance_criterion** (4)
  - SQLAlchemy 模型可在 pytest 中创建/查询
  - Alembic migration 可正常运行
  - Repository 基类抽象可用
  - ... +1 more

### design (1 nodes)
**design_decision** (1) A

### task (5 nodes)
**slice** (5)
  - slice-1
  - slice-2
  - slice-3
  - ... +2 more

## Cross-Cutting Concerns
**1** SSOT violations: 0 high, 0 medium, 1 low
- [LOW] design_decision (design vs task): 设计决策跨阶段不一致: "A" ≠ "slice-1"

## Stats
- Total nodes: 10
- Total edges: 5
- Phases with nodes: 3/8


## review (✓)
**评审**: REVIEW


---

**当前**: integration · Skill: @taiyi-integration · 工件: INTEGRATION.md
**复杂度**: low | Profile: api
**下一步**: 加载 @taiyi-integration，编辑 INTEGRATION.md

*引擎生成 · Agent 读此文件即可*

<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。
     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->