<!-- 项目级上下文 · 来自 taiyi-intel-scan · 引擎自动维护 -->
## Project Context

# CONTEXT: translation-assistant-tests

> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要

为 translation-assistant 补充集成测试、E2E 测试、性能测试和覆盖率报告。

## 相关目录

| 路径 | 关系 | 备注 |
|------|------|------|
| examples/translation-assistant/agent/backend/tests/ | 必读 | 现有测试 |
| examples/translation-assistant/agent/backend/app/ | 必读 | 被测代码 |
| examples/translation-assistant/agent/frontend/ | 参考 | E2E 目标 |

## 模式清单

- 测试框架：pytest, pytest-asyncio, pytest-cov
- 现有测试：backend/tests/ 下有单元测试

## 风险区

| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| MEDIUM | 依赖 Wave 1 完成 | 测试依赖其他 change 的代码稳定 | 按依赖顺序 |

## Handoff

- change：Scope 为测试增强

<!-- PROJECT-CONTEXT-END -->
# Change Graph: translation-assistant-tests

## Phases
### change (4 nodes)
**acceptance_criterion** (4)
  - 集成测试覆盖 6 个翻译方向
  - E2E 测试通过前端到后端全链路
  - 性能测试 P95 < 3s
  - ... +1 more

## Stats
- Total nodes: 4
- Total edges: 0
- Phases with nodes: 1/8


## dev (✓)
**开发**: TDD 已完成


---

**当前**: integration · Skill: @taiyi-integration · 工件: INTEGRATION.md
**复杂度**: low | Profile: micro
**下一步**: 加载 @taiyi-integration，编辑 INTEGRATION.md

*引擎生成 · Agent 读此文件即可*

<!-- ⚠️ SSOT 声明: 以下摘要仅作快速参考。各阶段真源始终是对应的上游工件 (CHANGE.md / DESIGN.md / TASK.md 等)。
     版本发生变更或阶段有冲突时，请直接读取工件文件而非本摘要。 -->