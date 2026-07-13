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
