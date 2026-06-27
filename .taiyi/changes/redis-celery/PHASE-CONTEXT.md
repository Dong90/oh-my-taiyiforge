<!-- 项目级上下文 · 来自 taiyi-intel-scan · 引擎自动维护 -->
## Project Context

# CONTEXT: redis-celery

> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要

为 translation-assistant 添加 Redis 缓存和 Celery 异步任务队列。

## 相关目录

| 路径 | 关系 | 备注 |
|------|------|------|
| examples/translation-assistant/agent/backend/app/services/ | 必读 | LLM 服务、翻译服务 |
| examples/translation-assistant/agent/backend/app/adapters/ | 必读 | OpenAI 适配器 |
| examples/translation-assistant/agent/backend/app/config/settings.py | 必读 | 配置入口 |

## 模式清单

- LLM 调用：OpenAIAdapter.chat_completion()
- 翻译流程：TranslationService → Strategy → Adapter
- 配置：pydantic-settings，环境变量优先

## 风险区

| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| MEDIUM | settings.py | 多 change 共享配置 | 各自追加配置项 |
| LOW | services/ | 新增缓存装饰器，不改核心逻辑 | — |

## Read First

1. examples/translation-assistant/agent/backend/app/services/translation_service.py — 翻译核心
2. examples/translation-assistant/agent/backend/app/services/llm_service.py — LLM 调用
3. examples/translation-assistant/agent/backend/app/config/settings.py — 配置

## Handoff

- change：Scope 为缓存 + 异步队列，不改变翻译逻辑
- design：缓存策略（per-direction + input hash 还是 per-request）

<!-- PROJECT-CONTEXT-END -->
# Change Graph: redis-celery

## Phases
### change (3 nodes)
**acceptance_criterion** (3) 相同翻译请求第二次命中缓存 / 数据库连接池正常工作 / Celery worker 可接收并执行异步任务

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
- Total nodes: 8
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