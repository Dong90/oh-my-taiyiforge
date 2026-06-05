---
name: taiyi-review
description: TaiyiForge 第 8 阶段 — 合并前评审，产出 REVIEW.md。四端通用。
---

# taiyi-review

## 目的

合并门禁：结构、安全、可维护性，与 **TEST 证据**交叉验证。REVIEW 的 Verdict 决定是否允许进入 integration。

## 何时使用

| 信号 | 建议 |
|------|------|
| `test` 已 complete | 必做 |
| 准备提 PR / merge | 必做 |
| high 复杂度 | **必须先** `taiyi-health` |

## 前置（high 复杂度）

若 `guide.complexity.level === high`：

1. 跑 `taiyi-health` → `health-report.md`
2. `scripts/taiyi-forge.sh mark-aux <slug> taiyi-health`
3. 否则 `complete review` 会被引擎拒绝

## 输入

- git diff（相对主分支）
- `TEST.md` Execution Log
- `DESIGN.md` Decision
- （可选）`health-report.md`、`architecture-sync.md`
- `REQUIREMENT.md` AC

## 输出

- `.taiyi/changes/<slug>/REVIEW.md`

## 执行步骤

### 1. Findings 表

| ID | 严重度 | 位置 | 描述 | 建议 |
|----|--------|------|------|------|
| F1 | high | src/api/export.ts:42 | 无超时 | 加 deadline |

严重度：**high** / **medium** / **low**。

### 2. Security & Trust checklist

- 输入校验、鉴权、敏感数据日志
- 依赖漏洞摘要（若 health 已跑可引用）
- LLM/AI 变更：信任边界（若适用）

### 3. 交叉验证

- 每条 **high** finding 须在 TEST 或 health 中有对应证据或豁免理由
- AC 未覆盖 → Request changes

### 4. Verdict

```markdown
## Verdict
**Approve** | **Request changes**

理由：...
```

- **high** 未解决 → 不得 Approve
- health BLOCK → 不得 Approve（除非明确豁免并记录）

### 5. 完成

`scripts/taiyi-forge.sh complete <slug> review`（**人工门**）

## 与 profile

- `lite`：仍执行 review（未跳过）
- 无代码变更的纯文档 slug：findings 可为空，但 Verdict 仍需理由

## 与下游衔接

| 下游 | REVIEW 须提供 |
|------|----------------|
| `taiyi-integration` | Approve + 发布说明素材 |
| PR 描述 | Findings 摘要可复制 |

## 与铁三角

- gstack `review` — 独立 diff 评审，结论写入 REVIEW.md
- `taiyi-health` — review 前基线（high 强制）

## 质量自检

- [ ] high 复杂度已 `mark-aux taiyi-health`
- [ ] Verdict 与 TEST 证据一致
- [ ] high findings 已处理或明确豁免
- [ ] Security checklist 已填（可 N/A 并说明）

## 禁止

- 无 TEST 证据 Approve
- 忽略 health BLOCK
- Verdict 与 findings 矛盾
- lite 误以为跳过 review
