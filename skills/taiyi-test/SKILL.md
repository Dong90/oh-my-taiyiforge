---
name: taiyi-test
description: TaiyiForge 第7阶段 — 测试验证，TEST.md。四端通用。
paradigm: Operator
---

# taiyi-test — 测试验证

## 步骤0 · 五轮声明（强制）

### 第1轮 · 功能测试
- 每条 AC ≥1 条覆盖
- Test Cases ≥5 条 TC
- 每条 TC **必须**用 Given/When/Then 格式
- 贴真实输出（非"应该能过"）

### 第2轮 · 性能测试（强制）
- 与基线对比（写具体数值）
- **禁止** `[填写理由]` `[工具]` `[结果]` 未替换
- 工具名必须明确（k6/Lighthouse/vitest --browser/autocannon）

### 第3轮 · 安全测试（强制）
- npm audit / trivy / SAST 三选一
- ≥3 个检查项
- **禁止**空 checkbox

### 第4轮 · 兼容测试（强制）
- 浏览器矩阵：Chrome/Safari/Firefox 各标版本 + 状态
- 视口矩阵：Mobile/Tablet/Desktop 各标状态
- 若 CLI-only → 每格写 "N/A — CLI only" 不留空

### 第5轮 · 可观测性测试（强制）
- 日志不泄露 PII
- 告警/监控 dashboard 已确认

## 内容深度规则

### Test Strategy（强制）
- `[vitest/jest/pytest]` → 替换为实际框架名
- `[X]%` → 替换为具体覆盖率数字
- 重点 bullet 至少 3 条

### 5-Round Coverage Matrix（强制）
- 每轮状态**必须**是以下之一：
  - ✅ 必跑 + 执行情况
  - ⚠️ N/A — <具体理由>（例："CLI only，无可观测端"）
  - ❌ 跳过 — <理由>
- **禁止** `[填写理由]` 残留

### Code Path Coverage（强制）
- 替换 `path/to/module.ts` 为实际路径
- 替换 `fn()` 为实际函数名
- 替换 `desc — file:line` 为实际行号
- 每个新增/修改函数在图中出现

### Edge Case Coverage（强制）
- ≥5 种场景
- 含并发/超时/非法输入/空值/资源耗尽

### UAT Scripts
- 若需要手动验证，步骤/期望必须完整填写
- **禁止**空步骤/空期望
- `[场景名]` 必须替换为实际场景

### Regression Test Plan（强制）
- 范围 + 用例数 + 执行方式 + 负责人都填
- 回归数据与实测一致

## 禁止残留（硬性）
- `[填写理由]` `[X]%` `[vitest/jest/pytest]` — 替换为实际值
- `path/to/module.ts` `fn()` `desc — file:line` — 替换为实际路径和函数
- `[场景名]` — 替换为实际场景名
- UAT 空步骤/空期望 = 不通过
- "应该能通过" = 不通过（必须贴实际输出）
- 6维衰退≥3仍complete → 禁止
- 没跑测试写"已通过" → 禁止

## 自检清单
- [ ] Test Strategy 框架名+覆盖率+重点已填实
- [ ] 5-Round 每轮状态明确，无 `[填写理由]`
- [ ] TC ≥5 条，Given/When/Then 格式
- [ ] Code Path Coverage 路径为实际路径
- [ ] Edge Cases ≥5 种
- [ ] UAT 无空步骤
- [ ] Performance 有具体数值对比
- [ ] Security ≥3 检查项
- [ ] 无任何模板占位符残留
- [ ] 数据与 REVIEW.md 一致
