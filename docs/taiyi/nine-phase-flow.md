# 九阶段流程全览

状态机推进路径：`change → requirement → design → ui-design → task → dev → test → review → integration`

每个阶段由 `taiyi-<phase>` SKILL.md 定义写法；引擎用 `scripts/taiyi-forge.sh status` / `continue` / `render` 校验并推进。

**工件契约**：`{phase}.json`（Zod 语义）→ hbs → `{PHASE}.md`（生成视图）。详见 [`artifact-contract.md`](./artifact-contract.md)。

**通用过关节奏**（每阶段相同；dev 无 json）：

```text
status → write（seed {phase}.json + 渲染 md）→ 编辑 json → render [phase] → status（预检）→ 用户确认 → continue
```

保存工件**不会**自动校验；须 Agent 代跑 `status` 或用户打 `/taiyi:status`。

---

## 阶段 1 — change

**Skill**: `taiyi-change` · **范式**: Partner · **产出**: `CHANGE.md` + `change.json`

### 入口前提
- slug 命名合理（小写+连字符）
- 用户确认变更目标
- 不与活跃 change 范围重叠

### Profile 适配
| Profile | 要求 |
|---------|------|
| full/api/ui | Motivation + In/Out Scope + Risks + Success Criteria |
| lite | 可省略 Risks |
| micro/spike | 仅 Motivation + Success Criteria |
| nano | 跳过本阶段 |

### 步骤
1. **编辑 change.json**（Motivation、Scope、Risks、Success Criteria）→ **`render <slug> change`**
2. **架构级变更检测**: 改模块结构/ADR/公共契约/跨服务 → 反问用户确认

### 过关命令
```bash
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug> --approver "名"
```
**人工门**：change 须 `--approver`。

### 致命约束
- NEVER 跳过 CHANGE 直接进 REQUIREMENT
- NEVER 在 CHANGE 中写实现细节
- NEVER 编造 Motivation
- NEVER 合并无关变更为一个 slug

---

## 阶段 2 — requirement

**Skill**: `taiyi-requirement` · **范式**: Partner · **产出**: `REQUIREMENT.md` + `requirement.json`

### 入口前提
- change 阶段已过关（`engineTruth`）
- 无跨 change 的 AC 冲突

### Profile 适配
| Profile | 要求 |
|---------|------|
| full | US + AC(Given/When/Then) + 域语言 + Traceability |
| api/ui | US + AC，域语言可选 |
| lite | 仅 AC 列表 |
| micro/spike/nano | 跳过 |

### 步骤
1. **编辑 requirement.json**（US / AC / 域语言 / Traceability）→ **`render <slug> requirement`**
2. 细则见 `taiyi-requirement`：US 追踪 CHANGE · AC Given/When/Then 可量化 · 域语言与 CONTEXT 一致 · Traceability（AC↔SC↔验证命令）

### 过关命令
```bash
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug>
```

### 致命约束
- NEVER 写不可量化的 AC
- NEVER 在 REQUIREMENT 中写技术方案
- NEVER 省略 Traceability
- NEVER 编造 US（须追踪到 CHANGE）

---

## 阶段 3 — design

**Skill**: `taiyi-design` · **范式**: Architect · **产出**: `DESIGN.md` + `design.json`

### 入口前提
- requirement 阶段已过关
- Brownfield 对齐：触碰模块/禁动清单/既有抽象
- 扫读过现有架构文档

### Profile 适配
| Profile | 设计深度 |
|---------|---------|
| full | Context + Options(≥2方案) + Decision + Architecture(图/数据流/文件树) + Risks + Verification Checklist + Open Questions |
| api/ui | 中等方案对比 + Decision + Module Layout |
| lite/micro/spike/nano | 跳过 |

### 步骤
1. **编辑 design.json**（Context / Options≥2 / Decision / Architecture / Risks / Verification / Open Questions / 沉淀建议）→ **`render <slug> design`**
2. 细节纪律见 `taiyi-design` Skill：Risks Mitigation 须可执行；Verification 须可执行命令 + 追踪 AC；Open Questions 高影响项须闭合

### 过关命令
```bash
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug> --approver "名"
```
**人工门**：design 须 `--approver`。

### 致命约束
- NEVER 单方案（非 lite 以下 profile）
- NEVER 用"use best practices"作为决策理由
- NEVER 跳过 Brownfield 对齐

---

## 阶段 4 — ui-design

**Skill**: `taiyi-ui-design` · **范式**: Partner · **产出**: `UI-DESIGN.md` + `ui-design.json`

### 入口前提
- design 阶段已过关
- 项目有 UI 层（`api` profile 等可跳过，以 `skippedPhases` 为准）

### Profile 适配
| Profile | 要求 |
|---------|------|
| full/ui | 布局原型 + 交互/动效 + 组件拆解 + 无障碍 + 状态+异常 + 与 DESIGN 差异 |
| api | 跳过 |
| lite | 跳过 |
| micro/spike/nano | 跳过 |

### 步骤
1. **确认 UI 基础设施**（grep Tailwind/Shadcn/Token）
2. **编辑 ui-design.json**（布局 / 交互 / 组件 / 无障碍 / 状态异常 / 与 DESIGN 差异；Must/Should/Could）→ **`render <slug> ui-design`**

### 过关命令
```bash
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug>
```

### 致命约束
- NEVER 在 UI-DESIGN 中写 CSS/React/实现代码
- NEVER 硬编码 hex 颜色（引用已有 tokens）
- NEVER 跳过空态/异常/Loading 段

---

## 阶段 5 — task

**Skill**: `taiyi-task` · **范式**: Partner · **产出**: `TASK.md` + `task.json`

### 入口前提
- 上游已过关（design；需 UI 时含 ui-design，以 `skippedPhases` 为准）
- 理解 DESIGN 方案取舍理由

### Profile 适配
| Profile | 要求 |
|---------|------|
| full/api/ui | T0.x 逐层检查 + 任务拆解 + 估算 + Scope Break + 全局 Resources |
| lite/micro/spike/nano | 跳过 |

### 步骤
1. **编辑 task.json**（T0.x 检查结论 + slices + waves + Scope Break）→ **`render <slug> task`**
2. 每切片须含 write_files / dependencies / test_command（Verify 可实跑）

### 过关命令
```bash
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug>
```

### 致命约束
- NEVER 添加 DESIGN/REQUIREMENT 未讨论的功能
- NEVER 跳过 T0.x 检查（full profile）
- NEVER 写跨 2+ 层的任务（每任务是垂直切片）

---

## 阶段 6 — dev

**Skill**: `taiyi-dev` · **范式**: Operator · **产出**: 实现代码 + `.dev-complete`（无 json）

### 入口前提
- task 阶段已过关
- 无未解决的 `[depends_on: ?]`
- 当前 git 分支干净

### Profile 适配
| Profile | 要求 |
|---------|------|
| full/api/ui | 全 TDD + 全部 0.x 检查 + 6 维 self-review |
| lite | TDD 可选，0.5（破坏性变更）必须 |
| micro/spike | 仅 0.1(grep) + 0.5 |
| nano | TDD 可选，0.5 必须 |

### 步骤
1. **0.x 上下文与门禁**（grep、LESSONS、UI、Schema、破坏性变更）
2. **TDD**: 红→绿→重构，证据写入 `.dev-complete`
3. **diff 边界 verify** + **六维 self-review**

### 过关命令
```bash
scripts/taiyi-forge.sh apply <slug> dev          # 可选：只打清单
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug>
```

### 致命约束
- NEVER 过关前不验证
- NEVER 跳过 0.5 协议
- NEVER 删除失败测试来"通过" CI

---

## 阶段 7 — test

**Skill**: `taiyi-test` · **范式**: Operator · **产出**: `TEST.md` + `test.json`

### 入口前提
- dev 已过关（`.dev-complete` 含 `exitCode: 0`）
- 明确项目的测试命令

### Profile 适配
| Profile | 要求 |
|---------|------|
| full/api/ui | 5 rounds + 6 维回归 + GREP 填空 + Traceability |
| lite | 跳过 round 4-5，6 维回归可选 |
| micro/spike/nano | 跳过 |

### 步骤
1. **实跑测试** → 更新 **test.json**（5 轮 + 6 维回归 + GREP + Traceability）→ **`render <slug> test`**

### 过关命令
```bash
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug>
```

### 致命约束
- NEVER 删除测试来"通过"
- NEVER 不实跑就声称"测试通过"

---

## 阶段 8 — review

**Skill**: `taiyi-review` · **范式**: Momus · **产出**: `REVIEW.md` + `review.json`

### 入口前提
- test 已过关
- git diff 与 base 的差异已清楚

### Profile 适配
| Profile | 要求 |
|---------|------|
| full/api/ui | 4 rounds + 修订循环 + ⭐ 评分 |
| lite | 3 rounds + 修订循环 + ⭐ |
| spike/micro | 1 round + ⭐ |
| nano | 跳过 |

### 步骤
1. **R1–R4** 审查 → 更新 **review.json**（findings + ⭐）→ **`render <slug> review`**
2. **修订循环**: critical 全 resolved，major ≥80%
3. **review-loop**（机器审查，过关前强制）
4. 可选：**taiyi-health** + `mark-aux`（medium/high 复杂度时 status 推荐）

### 过关命令
```bash
scripts/taiyi-forge.sh review-loop <slug>
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug> --approver "名"
```
**人工门**：review 须 `--approver`。

### 致命约束
- NEVER 跳过修订循环（critical/major）
- NEVER 汇总 < 4.0 还过关（除非用户确认 deferred）

---

## 阶段 9 — integration

**Skill**: `taiyi-integration` · **范式**: Operator · **产出**: 变更目录 `CHANGELOG.md` + `integration.json`，再 archive

### 入口前提
- review 已过关（⭐ ≥ 4.0）
- 全量测试通过

### Profile 适配
| Profile | 要求 |
|---------|------|
| full/api/ui/lite | integration 工件 + docs sync + 全量测试 + archive |
| spike/micro | 工件 + 全量测试 + archive，可跳过 docs sync |
| nano | 极简 dev 后 integration 工件 + archive |

### 步骤
0. **编辑 integration.json** → **`render <slug> integration`**（变更目录 `CHANGELOG.md`）
1. **docs sync**（项目根 README/CLAUDE/CHANGELOG，full/lite）
2. **全量测试** exit 0
3. **过关**: `status` → `continue`
4. **归档**: `archive`（不代替 continue）

### 过关与归档
```bash
scripts/taiyi-forge.sh status <slug> --json --compact
scripts/taiyi-forge.sh continue <slug>
scripts/taiyi-forge.sh archive <slug>
```

### 致命约束
- NEVER archive 而不跑全量测试
- NEVER 用项目根 CHANGELOG 代替变更目录 integration 工件

---

## 关键信息汇总

### 人工门 vs 引擎门

| 门 | 阶段 | 条件 |
|----|------|------|
| **人工门** | change | `continue --approver "名"` |
| **人工门** | design | `continue --approver "名"` |
| **人工门** | review | `continue --approver "名"` |
| **引擎门** | requirement, ui-design, task, dev, test, integration | json+渲染 md（或 .dev-complete）完备 + `status` 预检通过 |

### Profile 跳过（内置 · `skippedPhases`）

| Profile | 跳过的阶段 |
|---------|-----------|
| `full` / `ui` | （无） |
| `api` | ui-design |
| `lite` | design, ui-design, task, review |
| `spike` | requirement, design, ui-design, task, review |
| `micro` | requirement, design, ui-design, task, test, review |
| `nano` | change … review（仅 **dev → integration**） |

以 `status` 的 `skippedPhases` / `currentPhase` 为准，勿写被跳阶段的 json/md。

### 关键文件产出链

```text
.taiyi/changes/<slug>/
├── change.json → CHANGE.md（hbs）
├── requirement.json → REQUIREMENT.md
├── design.json → DESIGN.md
├── ui-design.json → UI-DESIGN.md
├── task.json → TASK.md
├── .dev-complete（无 json）
├── test.json → TEST.md
├── review.json → REVIEW.md
├── integration.json → CHANGELOG.md（变更目录）
└── state.json
```

刷新视图：`scripts/taiyi-forge.sh render <slug> [phase]`。

archive 后目录只读保留；根 `CHANGELOG.md` 由引擎在 integration 过关时合并。

### 回退命令

`scripts/taiyi-forge.sh undo <slug> <phaseId>` — 回滚该阶段及之后所有已完成阶段。**change 为基石不可 undo**。

| 阶段 | 回退命令示例 |
|------|-------------|
| 2 requirement | `scripts/taiyi-forge.sh undo <slug> requirement` |
| 3 design | `scripts/taiyi-forge.sh undo <slug> design` |
| 4 ui-design | `scripts/taiyi-forge.sh undo <slug> ui-design` |
| 5 task | `scripts/taiyi-forge.sh undo <slug> task` |
| 6 dev | `scripts/taiyi-forge.sh undo <slug> dev` |
| 7 test | `scripts/taiyi-forge.sh undo <slug> test` |
| 8 review | `scripts/taiyi-forge.sh undo <slug> review` |
| 9 integration | workflow 完成后不可 undo；archive 前可用 `undo <slug> integration` |

### 每个阶段的口诀

| 阶段 | 一句话 |
|------|--------|
| change | 说清楚做什么、不做什么、怎么算成功 |
| requirement | 每条 AC Given/When/Then，必须可量化 |
| design | 至少两个方案，记下取舍理由 |
| ui-design | 只写契约不写实现，Loading/Empty/Error 不能少 |
| task | 每任务是可独立验证的垂直切片 |
| dev | 先红后绿抓证据，破不破坏问用户 |
| test | 五轮覆盖 + 六维回归，新文件不能裸奔 |
| review | review-loop 过门，critical 修了再 approver |
| integration | 先 continue 过关，再 archive，全量测试绿 |
