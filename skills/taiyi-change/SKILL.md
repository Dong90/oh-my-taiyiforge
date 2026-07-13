---
name: taiyi-change
description: TaiyiForge 第1阶段 — 变更提案，CHANGE.md。四端通用。
paradigm: Partner
---

# taiyi-change — 变更提案

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段门禁与推进（`status` → `continue`；legacy：`npx taiyi complete`） | 全程 |
| **OMO** | 作为 workflow 入口，承接 `/taiyi:new` 命令 | 进入时 |
| **Superpowers** | `brainstorming` — 可选，当需求不清晰时加载协助梳理 | 可选 |
| **OpenSpec** | 将 CHANGE.md 同步到 `openspec/changes/<slug>/` | 可选（`taiyi sync-openspec`） |

**`Spec-Kit`** 和 **`GStack`** 在本阶段不涉及。

## 前置门禁（Pre-flight）

### 0.1 架构级变更检测
命中任一 → **反问用户确认**：
1. 改模块结构（新增/拆分/合并目录）
2. 动 ADR（架构决策记录）
3. 改公共契约（API 签名、CLI 参数、DB Schema）
4. 跨服务编排（涉及 2+ 独立服务）

### 0.2 Profile 判定

| Profile | CHANGE.md 要求 |
|---------|---------------|
| `full` | 完整：Motivation + In/Out Scope + Risks + Success Criteria |
| `api/ui` | 同上，Out of scope ≥ 1 条 |
| `lite` | 可省略 Risks 段，其余照常 |
| `micro/spike` | 仅 Motivation + Success Criteria，Out of scope 可选 |
| `nano` | 可跳过本阶段（引擎自动通过） |

### 0.3 前置检查清单
- [ ] slug 命名合理（小写+连字符，如 `fix-login-timeout`）
- [ ] 用户已确认变更目标（不是 AI 自己推断的需求）
- [ ] 不与其他活跃 change 的 Scope 重叠（`taiyi list` 确认）

---

## 步骤

### 工件契约

| 层 | 路径 | 职责 |
|----|------|------|
| **语义真源** | `change.json` | Zod（`src/schemas/change.ts`）— Agent **优先编辑** |
| **生成视图** | `CHANGE.md` | hbs（`src/templates/change.hbs`）— 人读 / PR |
| **流程** | 本 Skill | 门禁、写作纪律、下游衔接 |

**工作流**：编辑 json → `scripts/taiyi-forge.sh render <slug> change` → `status --json --compact` → 用户确认 → `continue --approver "名"`。

详见 [`docs/taiyi/artifact-contract.md`](../../docs/taiyi/artifact-contract.md)。

### json 字段（Zod 摘要）

| 字段 | 要求 |
|------|------|
| `title` | 描述性标题 |
| `motivation` | 谁痛、现状代价、改善指标（具体，不笼统） |
| `scope.includes` | In scope 条目 |
| `scope.excludes` | ≥1 条 Out of scope；关联 change 写 slug |
| `success_criteria` | ≥1 条；`id` + `description`；每条可映射到测试 |
| `risks` | full/api 推荐：`risk` / `probability` / `impact` / `mitigation` |
| `impact_map` | 可选；模块影响面声明 |
| `evidence` | `success_criteria[].is_checked=true` 时必填真跑命令 |

### 1. 编辑 change.json

`/taiyi:new` 已 seed `change.json` + `CHANGE.md`。

**Motivation 好/坏例子**（写入 `motivation`）：

> **好**：当前翻译需人工复制粘贴到 DeepL，每次约 10 分钟。集成 API 后翻译可在 5 秒内完成，消除手动步骤。

> **坏**：需要改进翻译功能。

**Success Criteria**（写入 `success_criteria[]`）：

- 每条可验证：curl / npm test / UI 操作步骤
- 不是「代码写好了」这类不可测试描述

**要求**：

- Motivation 说清「谁痛、现状代价、改善指标」，不笼统
- Out of Scope ≥ 1 条，标注关联 change slug（如有）
- Success Criteria 每条**可直接映射到测试**
- 影响面声明：是否需改 REQUIREMENT / 触及架构（`impact_map` 或 motivation 中说明）
- **不要**写实现细节；**不要**推断用户未确认的范围

### 2. 渲染 CHANGE.md

```bash
scripts/taiyi-forge.sh render <slug> change
```

Zod 校验通过后从 json 重生成 md（去掉 seed 标记）。`continue` 前若 json 已改且 md 仍是 seed/快照态，引擎也会自动 sync。人只改 md 时引擎可 reverse-sync 拉回 json；**显式 render 会覆盖 md**。

### 3. 过关（Harness）

1. 逐项检查 `## 质量自检`；有未通过项则不要过关。
2. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 解析 `engineTruth`（`qualityReady` / `blockers`）。
3. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug> --approver "名"`（change 人工门）。
4. 过关后再 `status --json --compact`，读 `engineTruth`；若 `currentPhase` 已变为 `requirement`，切换到 taiyi-requirement Skill 并通知用户。

Legacy：`npx taiyi complete <slug> change --approver "名"` 仍可用；聊天优先 `/taiyi:continue`。

## 产出

- `.taiyi/changes/<slug>/CHANGE.md`
- `.taiyi/changes/<slug>/change.json`

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-requirement` | Motivation + Scope → User Stories 边界；Success Criteria → AC Traceability；Out of scope → 不写 US 的范围 |
| `taiyi-design` | 影响面声明 → 架构决策范围；Success Criteria → 验证标准 |

## 异常处理

| 场景 | 处理 |
|------|------|
| `continue` 被拒（非零退出） | 读错误输出 → 缺少人工审批还是工件不完整。缺少审批 → 提示提供 `--approver`。工件不完整 → 补全后重试 status 再 continue。**最多 1 次自动重试** |
| CHANGE 与已有 change 范围重叠 | 在 Scope 中标注关联 slug，与用户确认是否需要合并或拆分 |
| 用户对 CHANGE 内容有争议 | 停止写入，等用户修改指示。**不要**自行协商修改范围 |
| Profile 判定 skip 但门禁拦截 | 确认 profile → 如是 `nano` 说明可跳过的理由，人工放行 |
| 误过关后续阶段 | **change 为基石不可 `undo`**；用 `scripts/taiyi-forge.sh undo <slug> requirement`（或更后阶段 id）回滚；仅需改 CHANGE 时直接编辑工件后 `status` |

<fatal_constraints>
- NEVER skip CHANGE and proceed to REQUIREMENT.
- NEVER write implementation details in CHANGE.md.
- NEVER write Success Criteria that cannot be mapped to tests.
- NEVER infer scope from conversation — scope must be written in change.json.
- NEVER fabricate Motivation or pain points not grounded in user's description.
- NEVER merge multiple unrelated changes into one slug.
</fatal_constraints>

## 质量自检

- [ ] 前置门禁三项全部通过（0.1–0.3）
- [ ] Motivation 说清了"谁痛、现状代价、改善指标"
- [ ] Out of scope ≥ 1 条
- [ ] In/Out 格式清晰（### 子节或 - In: 风格）
- [ ] Success Criteria 每条可映射到测试
- [ ] Risks 已记录（full/api profile）或说明"无显著风险"
- [ ] 架构级变更已检测（0.1）且结果已记录
- [ ] 影响面声明已写入

## 引擎门控（自动，无需手动确认）

- **WIP 限制**: 活跃种子 ≥ `TAIYI_MAX_SEEDS`(默认10) → 阻止创建。`--force` 或 `TAIYI_SEED_LIMIT=0` 跳过
- **复杂度重评估**: change 过关时按已填 CHANGE.md 重算复杂度（不再总是 "low"）
- **SC 可量化**: 所有 SC 均无数字/%/状态码 → agent 日志 warn（不阻止，人审兜底）
