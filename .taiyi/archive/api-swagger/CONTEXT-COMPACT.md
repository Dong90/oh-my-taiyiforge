# CONTEXT-COMPACT

> 自动压缩摘要 · 优先读此文件以降低 Token；细节见各工件原文件。

## CHANGE.md
# CHANGE: API 完善：版本化 + Swagger 文档 + 配置热加载 + 输入验证

## Motivation
项目 API 缺少版本管理、OpenAPI 文档不完善、配置不支持热加载。README 评估中这些项均标记为待实现。API 版本化是 API 演进的必要基础。

## Scope
- In:
  - API 路径版本化（/api/v1/...）
  - Swagger/ReDoc 文档完善
  - 配置热加载支持
  - 输入验证增强
- Out:
  - API 限流策略
  - API 认证

## Risks
- API 版本化涉及路径变更，需确保向后兼容
- main.py 被多个 change 修改，需约定区域策略

## Success Criteria
- [ ] Swagger UI 在 /docs 可访问
- [ ] /api/v1/translation/translate 路径可用
- [ ] 配置修改后无需重启即可生效
- [ ] 输入验证拒绝非法请求并返回结构化错误

## REQUIREMENT.md
# REQUIREMENT: API 规范化

## 验收标准

### AC-01: Swagger UI 可访问
- Given: 服务运行中
- When: 访问 GET /docs
- Then: 显示完整的 Swagger UI，列出所有 API 端点

### AC-02: API 版本化路径
- Given: 服务运行中
- When: POST /api/v1/translation/translate
- Then: 正常返回翻译结果，旧路径返回 deprecation warning

### AC-03: 配置热加载
- Given: 服务运行中
- When: 修改 .env 中的 LOG_LEVEL=DEBUG
- Then: 无需重启，日志级别自动切换为 DEBUG

### AC-04: 输入验证增强
- Given: 服务运行中
- When: 发送缺少必填字段 text 的请求
- Then: 返回 422 和结构化错误

## DESIGN.md
# DESIGN: API 规范化（≥2 方案对比）

## 方案 A：URL Path 版本化 + FastAPI 原生 OpenAPI
**技术选型**: /api/v1/* 路径前缀 + FastAPI 自动生成 OpenAPI schema

**架构**:
```
app/controllers/v1/ → 版本化的路由
FastAPI(title, version, docs_url="/docs") → OpenAPI
pydantic-settings + watchfiles → 热加载
```

**优点**: 零额外依赖，FastAPI 原生支持，URL 版本化直观
**缺点**: 多版本共存时代码量翻倍

## 方案 B：Header 版本化 + 自定义 OpenAPI 生成
**技术选型**: Accept-Version header + 手动 OpenAPI 构建

**优点**: URL 保持干净
**缺点**: 调试不直观（curl 需加 header），文档工具支持差

## 决策
选 **方案 A**。理由：
1. URL 版本化是最广泛使用的 REST API 版本策略
2. FastAPI 原生 OpenAPI 生成，零额外维护成本
3. Swagger UI 自动可用，开发者体验好

## TASK.md
# TASK: API 规范化

## Slices
| # | Slice | Depends | Done |
|---|-------|---------|------|
| 1 | API 版本化路由 (/api/v1/*) | — | RED test green |
| 2 | Swagger/ReDoc 文档完善 | 1 | RED test green |
| 3 | 配置热加载 (watchfiles) | — | RED test green |
| 4 | Pydantic 输入验证增强 | 1 | RED test green |

## Checklist per Slice
- [ ] RED — 先写测试
- [ ] GREEN — 最小实现
- [ ] REFACTOR — 清理代码

## Dependencies & Risks
- 风险: controllers/ 下多个文件需修改，版本化路由需向后兼容
- 风险: main.py 被多 change 修改（与 observability, security 共享）
- 阻塞项: 无上游依赖

## Non-goals
- API 限流策略（归 jwt-api-key-cors）
- API 认证（归 jwt-api-key-cors）
- GraphQL 端点

## TEST.md
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

## REVIEW.md
<!-- taiyi:seed-template -->

# REVIEW: API 完善：版本化 + Swagger 文档 + 配置热加载 + 输入验证

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
# CONTEXT: api-swagger
> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要
完善 translation-assistant 的 API 设计：版本化、Swagger 文档、配置热加载和输入验证增强。

## 相关目录
| 路径 | 关系 | 备注 |
|------|------|------|
| examples/translation-assistant/agent/backend/app/controllers/ | 必读 | 三个控制器 |
| examples/translation-assistant/agent/backend/app/models/ | 必读 | Pydantic 模型 |
| examples/translation-assistant/agent/backend/app/config/settings.py | 必读 | 配置 |
| examples/translation-assistant/agent/backend/app/main.py | 必读 | 应用入口 |

## 模式清单
- API 端点：/api/translation/translate, /api/translation/translate/stream
- 健康检查：/health, /ready, /live
- 模型：TranslationRequest, TranslationResponse, StreamChunk
- 配置：pydantic-settings BaseSettings

## 风险区
| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| MEDIUM | controllers/ | API 路径变更需向后兼容 | 保留旧路径 + deprecation warning |
| MEDIUM | main.py | 多 change 共享 | 约定区域 |

## Read First
1. examples/translation-assistant/agent/backend/app/main.py — 路由注册
2. examples/translation-assistant/agent/backend/app/models/translation.py — 请求响应模型
3. examples/translation-assistant/agent/backend/app/config/settings.py — 配置类

## Handoff
- change：Scope 为 API 规范化，不改业务逻辑
- design：版本化策略（URL path vs header）

## architecture-sync.md
# Architecture Sync: api-swagger

## adr/001-design-decision.md
# ADR: URL Path 版本化 (/api/v1/*) + FastAPI 原生 OpenAPI

## 状态: 已提议

## 决策
采用 URL Path 版本化（/api/v1/*）+ FastAPI 自动生成的 OpenAPI schema。

## 理由
- URL 版本化是 REST API 最广泛使用的策略
- FastAPI 原生 OpenAPI 生成，零额外维护
- Swagger UI / ReDoc 自动可用
- pydantic-settings 支持 watchfiles 热加载
