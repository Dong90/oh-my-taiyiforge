---
name: taiyi-test
description: TaiyiForge 第7阶段 — 测试验证，TEST.md。四端通用。
paradigm: Operator
---

# taiyi-test — 测试验证

## 步骤0 · 五轮声明(强制)
功能/性能/安全/兼容/可观测。跳过必须写理由。

## 第1轮 · 功能测试
- 每条AC≥1条覆盖
- 贴真实输出
- 6维测试衰退(T1-T6)：T1意图/T2脆性/T3重复/T4Mock/T5假象/T6架构。命中≥3→必修

## 第2-5轮
性能(与基线对比)/安全(npm audit+OWASP)/兼容(迁移up+down)/可观测(log不泄露PII)

## 禁止
- 未跑测试写"已通过"
- 6维衰退≥3仍complete
