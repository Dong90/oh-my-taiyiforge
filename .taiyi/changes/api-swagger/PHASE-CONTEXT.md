<!-- 项目级上下文 · 来自 taiyi-intel-scan · 引擎自动维护 -->
## Project Context

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

<!-- PROJECT-CONTEXT-END -->
# Change Graph: api-swagger

## Phases
### change (4 nodes)
**acceptance_criterion** (4)
  - Swagger UI 在 /docs 可访问
  - /api/v1/translation/translate 路径可用
  - 配置修改后无需重启即可生效
  - ... +1 more

### design (1 nodes)
**design_decision** (1) A

### task (4 nodes)
**slice** (4)
  - slice-1
  - slice-2
  - slice-3
  - ... +1 more

## Cross-Cutting Concerns
**1** SSOT violations: 0 high, 0 medium, 1 low
- [LOW] design_decision (design vs task): 设计决策跨阶段不一致: "A" ≠ "slice-1"

## Stats
- Total nodes: 9
- Total edges: 4
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