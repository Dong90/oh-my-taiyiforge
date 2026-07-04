# CONTEXT-COMPACT

> 自动压缩摘要 · 优先读此文件以降低 Token；细节见各工件原文件。

## CHANGE.md
# CHANGE: 翻译助手测试覆盖增强

## Motivation
项目当前仅有单元测试。README 评估中集成测试、E2E 测试、性能测试、覆盖率报告全部待实现。

## Scope
- In:
  - 集成测试（翻译 API 完整调用链）
  - E2E 测试（前端到后端全链路）
  - 性能测试（并发请求 + 响应时间基准）
  - pytest-cov 覆盖率报告配置
- Out:
  - 负载测试工具部署（JMeter/K6）

## Risks
- E2E 测试需要服务运行，依赖 CI 环境配置
- 性能测试基准需在稳定环境中校准

## Success Criteria
- [ ] 集成测试覆盖 6 个翻译方向
- [ ] E2E 测试通过前端发送请求到后端
- [ ] 性能测试 P95 < 3s
- [ ] 覆盖率报告 > 80%

## CONTEXT.md
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
