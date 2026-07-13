---
name: taiyi-task
description: TaiyiForge 第5阶段 — 任务拆解，TASK.md。四端通用。
paradigm: Partner
---

# taiyi-task — 任务拆解

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段门禁与推进（`status` → `continue`；legacy：`npx taiyi complete`） | 全程 |
| **OMO** | 任务切片遵循 OMO 垂直切片规范 | T1 任务拆解步骤 |

**Superpowers / GStack / OpenSpec / Spec-Kit** 在本阶段不涉及。

## 前置门禁（Pre-flight）

### 0.1 上游确认
- ui-design 已过关（如有 UI 层；`skippedPhases` 含 `ui-design` 时可跳过）；design 已过关

### 0.2 Profile 判定

| Profile | TASK.md 要求 |
|---------|-------------|
| `full` | 完整：T0X 逐层检查 + 入口预设 + 任务拆解 + 估算 + Scope Break + 全局 Resources |
| `api/ui` | 同 full |
| `lite` | 简化版：可跳过 T0X 和 Scope Break |
| `micro/spike` | 可跳过本阶段 |
| `nano` | 跳过 |

### 0.3 前置检查清单
- [ ] 上游阶段已过关（DESIGN；需 UI 时含 ui-design，以 `engineTruth.skippedPhases` 为准）
- [ ] 理解 DESIGN.md 中两个方案的取舍理由

---

## 步骤

### 工件契约

| 层 | 路径 | 职责 |
|----|------|------|
| **语义真源** | `task.json` | Zod（`src/schemas/task.ts`） |
| **生成视图** | `TASK.md` | hbs（`src/templates/task.hbs`） |
| **流程** | 本 Skill | T0.x 检查、切片、write_files 边界 |

**工作流**：编辑 json → `scripts/taiyi-forge.sh render <slug> task` → `status` → `continue`。

详见 [`docs/taiyi/artifact-contract.md`](../../docs/taiyi/artifact-contract.md)。

### json 字段（Zod 摘要）

| 字段 | 要求 |
|------|------|
| `title` | 任务拆解标题 |
| `slices` | ≥1 切片；`id` / `description` / `write_files` / `dependencies` / `test_command` |
| `waves` | 可选；执行波次与 slice 分组 |
| `slice_risks` / `slice_rollbacks` | 可选；风险与回滚 |
| `scores` / `completeness_score` | 可选；自评 0–10 |
| `evolutionSuggestions` | 可选；架构沉淀 |

切片字段对齐下文 **T1 主任务拆解** 六要素（Level → `time_estimate`、Verify → `test_command` / `verification`）。

### 写作指引（填入 json，render 生成 TASK.md）

### 入口预设（写在 TASK.md 顶部）

```
# TASK: <slug 描述性标题>

## Engineer Context
- 本 change 在 TaiyiForge 第 5 阶段（task）
- UI-DESIGN.md 与 DESIGN.md 确认了方案
- 你只能从 TASK 任务池中挑选，**不实现未列出的功能**
- **不修改**非 write_files 清单中列出的文件
```

### T0X 逐层检查（T0.1 - T0.7）

每层检查结果为 ⛔（阻止）/ ⚠️（需更新）/ ✅（通过）：

```
### T0.1 技术栈决策确认
- [ ] 语言版本（TS 5.x / Python 3.12+）
- [ ] 框架（Express / Next.js / Gin）
- [ ] 组件库（Shadcn / MUI / BYO）
- [ ] 测试框架（Vitest / Pytest / Jest）
- [ ] 样式方案（Tailwind / CSS Modules / CSS-in-JS）
- [ ] 所有项通过 ✅ → 继续

### T0.2 文件分析
前置：grep/glob 扫描项目文件结构。
- [ ] 新文件路径不与现有文件冲突
- [ ] 修改已知文件时已在项目中找到
- [ ] 无依赖遗漏（如缺少的 npm 包）

### T0.3 影响与兼容
- [ ] 没有改到公共 API 签名（如有需在 TASK 中声明）
- [ ] 没有引入破坏性 DB 迁移
- [ ] 改 schema 时同时有 up + down 迁移

### T0.4 测试兼容
- [ ] 知道已有测试的 runner 命令和配置文件路径
- [ ] 新增测试定位遵循项目模式（unit / integration / e2e）
- [ ] 已有测试不因本 change 而需要重构

### T0.5 设计兼容
- [ ] 新代码沿用 DESIGN.md 约束（如 Modest vs Bold 方案）
- [ ] 没引入 DESIGN 未讨论的新抽象/模式

### T0.6 UI 兼容（仅 UI 层 change）
- [ ] 色值/字体/间距引用 UI-DESIGN.md 或 project tokens
- [ ] 组件路径不与已有组织冲突

### T0.7 遗留决策记录
```
| Notion | Decision | Alternate | Consequences | T0.X 检查 |
|--------|----------|-----------|--------------|-----------|
```

---

### T1. 主任务拆解

每个任务格式相同的 6 字段节：

```
### T0X — 任务标题

**Level**: 0 / 1 / 2（0=底层抽象/配置，1=核心逻辑，2=集成封装）
**Estimate (confidence)**: 30min H / 2h M / 4h L

**Description**:
- 一句话描述

**Why separate**:
- 为什么要单独分拆

**Write files**:
- [new] `src/foo/bar.ts`
- [edit] `src/foo/index.ts`

**Dependencies**:
- T01 — 本任务在 T01 之后
- T02 — 本任务与 T02 可并行

**Verify**:
```
$ npx vitest run tests/unit/foo --reporter=verbose
...
```
```

**拆分原则**：
- 0 级任务（底层抽象/配置）放在前面，避免后续任务 blocked
- 可并行的任务标注 Dependencies 关系
- Verify 使用真实命令 + 预期关键输出

### T2. 全局资源

```
## 全局资源与偏差捕获

### npm scripts
| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动 dev server |

### 模块路径别名
- `@/` → `src/`
- `@components/` → `src/components/`
```

### T3. Scope Break 检查

```
## Scope Break (Pre-Flight)

- [ ] 所有 Write files 不超出 DESIGN 文件范围
- [ ] 没有引入 DESIGN 未讨论的新依赖
- [ ] 每个任务验证命令真实可用
```

---

## 过关（Harness）

1. 逐项检查 `## 质量自检`；有未通过项则不要过关。
2. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 解析 `engineTruth`（`qualityReady` / `blockers`）。
3. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug>`。
4. 过关后再 `status --json --compact`，读 `engineTruth`；若 `currentPhase` 已变为 `dev`，切换到 taiyi-dev Skill 并通知用户。

Legacy：`npx taiyi complete <slug> task` 仍可用；聊天优先 `/taiyi:continue`。

## 产出

- `.taiyi/changes/<slug>/TASK.md`
- `.taiyi/changes/<slug>/task.json`

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-dev` | Write files → 实现边界；Verify 命令 → 通过标准；Dependencies → 执行顺序；T0.7 遗留决策 → 约束条件 |
| `taiyi-test` | Verify 命令 → 功能测试范围；Write files 清单 → 测试必须覆盖的文件 |

## 异常处理

| 场景 | 处理 |
|------|------|
| UI-DESIGN 未过关（需 UI 层时） | phase guard 拦截，退回完成 ui-design |
| T0.x 检查有 ⛔ 阻止项 | 不能过关 task 阶段，修复后重试 |
| 任务拆分粒度过粗 | 拆分原则：1 任务 = 1 个独立可验证的功能点，如果跨 3+ 文件或涉及 2+ 层（前端+后端），拆为多个任务 |
| DESIGN.md 两个方案的选择理由不明确 | 在 TASK 入口声明所选方案，备注另一个方案的 scope 延迟 |
| `continue` 被拒 | 检查 T0.x 是否全部 ✅、Scope Break 是否通过。修复后 status 再 continue |
| 误过关本阶段或后续 | `scripts/taiyi-forge.sh undo <slug> task` |

<fatal_constraints>
- NEVER add features not traceable to DESIGN.md or REQUIREMENT.md.
- NEVER skip T0.x checks (they catch most downstream rework).
- NEVER write tasks that cross 2+ layers — each task must be a vertical slice.
- NEVER write Verify commands that are placeholders — every command must run in the actual project.
- NEVER skip Dependencies field — all tasks require explicit dependency declaration.
</fatal_constraints>

## 质量自检

- [ ] 前置门禁已通过（0.1–0.3）
- [ ] 入口预设已写（Engineer Context）
- [ ] T0.1–T0.7 逐层检查全部 ✅
- [ ] 每个任务有 Level / Estimate / Why separate / Write files / Dependencies / Verify
- [ ] 每个 FR（caller_module 在本 scope 内的）至少 1 个切片覆盖（covers_frs 字段）
- [ ] Verify 命令可实际运行（非占位符）
- [ ] Scope Break 已通过
- [ ] Write files 不超出 DESIGN 范围
- [ ] 所有依赖在 package.json 中或标注为外部
