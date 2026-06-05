---
name: taiyi-change
description: TaiyiForge 第 1 阶段 — 变更提案，产出 CHANGE.md。四端通用。
---

# taiyi-change

## 目的

对齐**为什么做、做什么、不做什么、如何验收**，避免在对话里隐式改 scope。CHANGE 是整条九阶段链的**真源意图**，后续 REQUIREMENT / DESIGN / TASK 必须能追溯回本文。

## 何时使用

| 信号 | 建议 |
|------|------|
| `taiyi init` 刚完成 | **必做**，第一步 |
| `taiyi next` 显示 `currentPhase: change` | 必做 |
| 用户想「直接写代码」 | **先拦下**，补 CHANGE |
| 中途 scope 膨胀 | 回到 CHANGE 修订并 re-complete（若已过后续阶段需评估回滚） |

## 何时不用

- 同一 slug 的 CHANGE 已 complete 且 scope 未变（进入 requirement）

## 输入

- 用户意图、Issue、产品 brief、Slack 讨论摘要
- （强烈建议）`taiyi-intel-scan` → `CONTEXT.md`
- `scripts/taiyi-forge.sh guide <slug>` 的 `recommendedAuxiliary`、`complexity`

## 输出

- `.taiyi/changes/<slug>/CHANGE.md`（模板：`templates/CHANGE.md`）
- 间接影响：`state.json` 中 `profile` / `complexity` 推断

## 执行步骤

### 1. 对齐上下文

1. `scripts/taiyi-forge.sh next <slug>` — 看推荐辅助 Skill（通常含 `taiyi-intel-scan`）
2. 若尚无 `CONTEXT.md` 且 assess ≥ medium：先跑 intel-scan
3. 读模板，确认 Motivation / Scope / Risks / Success Criteria 四块齐全

### 2. 写 Motivation

- **问题**：谁痛、痛在哪、现状代价（可量化更好）
- **机会**：做完后什么指标或体验改善
- 避免「技术驱动」开头（应先业务/用户）

### 3. 写 Scope

- **In scope**：动词 + 对象 + 边界（模块、端、环境）
- **Out of scope**：明确不做，防止范围蠕变
- **Profile 旁注**（与 init 一致）：

| Profile | 适用 | init 参数 |
|---------|------|-----------|
| `full` | 全栈新功能 | 默认 |
| `api` | 纯后端/API/CLI/库 | `--profile api` |
| `lite` | 小 bug、文案、单点修复 | `--profile lite` |

若 init 时 profile 选错，在 Scope 注明并在下轮 init 新 slug（勿 silent 改 state）。

### 4. 写 Risks

| 类型 | 示例 |
|------|------|
| 技术 | 依赖过期 API、无测试覆盖区 |
| 产品 | 与现有 UX 冲突 |
| 组织 | 需第三方审批、合规 |

每条风险带 **缓解** 或 **接受理由**。

### 5. 写 Success Criteria

- 必须**可验证**：checkbox、测试命令、演示步骤、指标阈值
- 与 REQUIREMENT 的 AC 一一对应（先在这里写「验收什么」，细节留给 requirement）

### 6. 完成阶段

1. 对照质量自检清单
2. `scripts/taiyi-forge.sh complete <slug> change`（**人工门**：change 默认需审批）

## CHANGE.md 片段模板

```markdown
## Motivation
用户导出报表超时（p95 > 30s），支持工单每周 12 单。

## Scope
**In:** 导出 API 分页 + 后台任务队列
**Out:** 前端表格改版、历史数据迁移
**Profile:** api

## Risks
| 风险 | 缓解 |
|------|------|
| 队列积压 | 限流 + 监控告警 |

## Success Criteria
- [ ] 10 万行导出 p95 < 5s（集成测试）
- [ ] 失败任务可重试且审计日志完整
```

## 与下游衔接（Handoff）

| 下游 | CHANGE 须提供 |
|------|----------------|
| `taiyi-requirement` | 可拆故事的 Scope + Success Criteria |
| `taiyi-design` | 技术风险与约束提示 |
| `taiyi-assess` | Scope 关键词供复杂度推断 |

## 与铁三角

- Superpowers `brainstorming` — 立项前澄清（见 `guide.harness`）
- 有 OpenSpec 时：init 后可 `openspec change show <slug>` 对照

## 质量自检

- [ ] Out of scope 至少 2 条或明确「无」并说明
- [ ] Success Criteria 均可验证，无「更好」「更快」裸词
- [ ] 与 CONTEXT 无矛盾；冲突已在 Risks 说明
- [ ] Profile 与变更类型匹配

## 禁止

- 跳过 CHANGE 直接写 REQUIREMENT 或代码
- 在 CHANGE 写具体实现细节（类名、SQL、组件树 → DESIGN/TASK）
- Success Criteria 无法映射到未来测试
- 未读 CONTEXT 就否定现有架构约束
