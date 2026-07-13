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
