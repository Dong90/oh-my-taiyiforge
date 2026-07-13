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
