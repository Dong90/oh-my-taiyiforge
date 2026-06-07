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
| medium / high 复杂度 | **必须先** `taiyi-health` |

## 前置（medium / high 复杂度）

若 `guide.complexity.level` 为 `medium` 或 `high`：

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
- [ ] **Approve** — 可合并
- [ ] **Request changes**
```

- **high** 未解决 → 不得 Approve
- health BLOCK → 不得 Approve（除非明确豁免并记录）

### 5. Review 循环（/taiyi:review-loop — 直到通过才停）

用户打 **`/taiyi:review-loop`** = **任意阶段可直接启动** review 会话循环：Agent **在同一会话内**重复审查，**无 blocking 项前不得停止**（对齐 `/taiyi:loop`）。

```bash
scripts/taiyi-forge.sh review-loop <slug>   # 启动循环（强制先新一轮 review，不直接过关）
scripts/taiyi-forge.sh review-check <slug>  # 写完 REVIEW.md 后跑循环门禁
```

| 步骤 | Agent 动作 |
|------|------------|
| 0 | `review-loop` → 引擎要求**新一轮** review（禁止复用旧 REVIEW.md） |
| 1 | 本 Skill / gstack review → 基于 **git diff** 写**新** `REVIEW.md` |
| 2 | `review-check` — 是否仍有 blocking 项（未解决 high / Request changes） |
| 3a | ✗ 未通过 → 修代码/`TEST.md` → **重新 review（步骤 1）** |
| 3b | ✓ 通过 → **停止循环** → 人工过关（见下） |

**两档门禁**（勿混淆）：

| 命令 | 标准 |
|------|------|
| `review-check` / `review-loop` | 无 open high、非 Request changes、非 missing Verdict 即可停循环 |
| `complete review` | 还须明确勾选 `[x] **Approve**`（`evaluateMachineReview`） |

轮次记入 `.review-loop-state.json`（默认上限 20 轮，`TAIYI_REVIEW_LOOP_MAX_ROUNDS`）。

机器门禁规则（`complete review` 阶段工件）：

- `## Verdict` 须勾选 **`[x] **Approve**`**
- 不得为 **Request changes**
- Findings 表中 **high** 行须标 `✅` / fixed / 已修复 / 豁免 等

仅探测、不计轮次：`npx taiyi review-check <slug>`

### 6. 完成（人工门）

循环门禁通过后：

`scripts/taiyi-forge.sh complete <slug> review --approver "审批人"` 或 `npx taiyi complete <slug> review --approver "审批人"`（OpenCode `taiyi_complete` 须传 `approver`）

## 与 profile

- `lite`：**跳过** `review` 阶段（见 `PROFILE_SKIPPED`），无需 REVIEW.md
- `full` / `api` / `ui`：须完整 review 流程
- 无代码变更的纯文档 slug：findings 可为空，但 Verdict 仍需理由

## 与下游衔接

| 下游 | REVIEW 须提供 |
|------|----------------|
| `taiyi-integration` | Approve + 发布说明素材 |
| PR 描述 | Findings 摘要可复制 |

## 与铁三角

- gstack `review` — 独立 diff 评审，结论写入 REVIEW.md
- `taiyi-health` — review 前基线（medium / high 强制）

## 质量自检

- [ ] medium/high 复杂度已 `mark-aux taiyi-health`
- [ ] Verdict 与 TEST 证据一致
- [ ] high findings 已处理或明确豁免
- [ ] Security checklist 已填（可 N/A 并说明）
- [ ] `review-check` 通过后已勾选 Approve 再 `complete`

## 禁止

- 无 TEST 证据 Approve
- 忽略 health BLOCK
- Verdict 与 findings 矛盾
- 把 `review-check` 通过当作 `complete review` 已通过
