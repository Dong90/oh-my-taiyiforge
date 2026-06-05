---
name: taiyi-requirement
description: TaiyiForge 第 2 阶段 — 需求与验收标准，产出 REQUIREMENT.md。四端通用。
---

# taiyi-requirement

## 目的

把 CHANGE 里的意图变成**可测试的用户故事与验收标准（AC）**，供 design / dev / test 全链路追溯。REQUIREMENT 是「测什么」的契约，不是「怎么做」。

## 何时使用

| 信号 | 建议 |
|------|------|
| `change` 已 complete | 必做 |
| `taiyi next` → `requirement` | 必做 |
| lite profile | complete 后直接进入 `dev`（仍建议写薄版 REQUIREMENT） |

## 输入

- `CHANGE.md`（**必读**：Scope、Success Criteria）
- （可选）`CONTEXT.md` — 约束与命名惯例
- OpenSpec spec 草稿（若已 sync）

## 输出

- `.taiyi/changes/<slug>/REQUIREMENT.md`

## 执行步骤

### 1. 从 CHANGE 拆故事

1. 每条 Success Criteria 至少对应一个 **User Story（US-*）**
2. 故事格式：**As a** \<角色\> **I want** \<能力\> **So that** \<价值\>
3. 标优先级：**MVP**（本变更必须）/ **Later**（明确不阻塞 complete）

### 2. 写验收标准（AC）

每条 US 下写 **Given / When / Then**（或等价 BDD）：

```markdown
### US-1 导出大报表
**Priority:** MVP

- **Given** 用户已登录且有导出权限
- **When** 请求导出 10 万行 CSV
- **Then** 任务入队且 HTTP 202；完成后下载链接 24h 有效
```

无 UI 时 AC 写 **API/CLI 可观测结果**（状态码、JSON 字段、退出码）。

### 3. Traceability 表

| AC / US | CHANGE Success Criteria | 验证方式 |
|---------|-------------------------|----------|
| US-1 | SC-1 导出 p95 | 集成测试 `export-large.test.ts` |

### 4. 非功能需求（按需）

- 性能、安全、i18n、a11y — 仅写 CHANGE 或 DESIGN 已暗示的项
- 每项仍要可验证

### 5. 完成

1. `npx taiyi guide <slug>` — `qualityHints` 应为空
2. `npx taiyi complete <slug> requirement`

## REQUIREMENT.md 结构模板

```markdown
# REQUIREMENT: <slug>

## User Stories

### US-1 ...
...

## Traceability
| US | CHANGE SC | Verification |
|----|-----------|--------------|

## Non-functional (optional)
- NFR-1: ...
```

## 与 profile

| Profile | 注意 |
|---------|------|
| `full` / `api` | 标准九阶段（api 跳过 ui-design） |
| `lite` | 故事可 1–2 条；complete 后 → `dev` |

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-design` | MVP 故事 + 约束 |
| `taiyi-task` | 可切片的 AC |
| `taiyi-test` | AC 列表作为测试矩阵来源 |

## 与铁三角

- OpenSpec：`openspec change show <slug>` 对照 proposal/spec
- 复杂域：Superpowers `brainstorming` 澄清边界案例

## 质量自检

- [ ] 每条 MVP AC 可自动化或写明手动步骤
- [ ] Traceability 覆盖 CHANGE 全部 Success Criteria
- [ ] 无 UI 需求时注明「验证：API/CLI/日志」
- [ ] 无 CHANGE Out of scope 外的新功能

## 禁止

- AC 含糊（「更快」「更好」无量化）
- 在 REQUIREMENT 写技术方案（→ DESIGN）
- 故事无法被 TEST.md 映射
- 跳过 Traceability（门禁可能提示 consistency）
