---
name: taiyi-requirement
description: TaiyiForge 第2阶段 — 需求分析，REQUIREMENT.md。四端通用。
paradigm: Partner
---

# taiyi-requirement — 需求分析

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段门禁与推进（`status` → `continue`；legacy：`npx taiyi complete`） | 全程 |
| **OpenSpec** | 将 REQUIREMENT.md 同步到 openspec 格式 | 可选 |

**Superpowers / GStack / Spec-Kit / OMO** 在本阶段不涉及。

## 前置门禁（Pre-flight）

### 0.1 上游检查
- change 阶段已过关（`engineTruth.completedPhases` 含 `change` 或 `currentPhase` 已推进）
- 无跨 change 的 AC 冲突（`taiyi list` 检查其他活跃 change 的 scope）

### 0.2 Profile 判定

| Profile | REQUIREMENT.md 要求 |
|---------|-------------------|
| `full` | 完整：User Stories + AC(Given/When/Then) + 域语言 + Traceability |
| `api/ui` | User Stories + AC，域语言可选 |
| `lite` | 仅 AC 列表，可省 User Stories |
| `micro/spike` | 可跳过本阶段 |
| `nano` | 跳过 |

### 0.3 触发者检查

每个 FR 必须声明触发点：

- 每个 FR 必须填写 `trigger`（谁调用、什么时机）
- `trigger` 指向的 `caller_module` 不在本 change scope 中 → 填 `blocked_by` 标注依赖
- `blocked_by` 非空 → 本阶段不能过关，等依赖 change 完成后再继续

```
"functional_requirements": [{
  "module": "orchestrator",
  "items": [{
    "id": "FR-T01",
    "description": "track(slug,role,amount) 更新 pipeline.json tokenBudget.used",
    "trigger": "executor.dispatch() 每次调用后",
    "caller_module": "packages/orchestrator/src/executor.ts",
    "blocked_by": "M4-executor"
  }]
}]
```

`blocked_by` 非空时引擎会在 status 中报 blocker，阻止进入 design 阶段。

### 0.4 前置检查清单
- [ ] change 阶段已过关
- [ ] 理解 CHANGE Scope 和 Out of Scope 边界
- [ ] 每个 FR 有 trigger（谁调用、什么时机）；caller 不在 scope 时填 blocked_by

---

## 步骤

### 工件契约

| 层 | 路径 | 职责 |
|----|------|------|
| **语义真源** | `requirement.json` | Zod（`src/schemas/requirement.ts`） |
| **生成视图** | `REQUIREMENT.md` | hbs（`src/templates/requirement.hbs`） |
| **流程** | 本 Skill | US / AC / 域语言 / Traceability 纪律 |

**工作流**：编辑 json → `scripts/taiyi-forge.sh render <slug> requirement` → `status` → `continue`。

详见 [`docs/taiyi/artifact-contract.md`](../../docs/taiyi/artifact-contract.md)。

### json 字段（Zod 摘要）

| 字段 | 要求 |
|------|------|
| `title` | 一句话概括核心需求 |
| `features` | 核心功能点列表 |
| `scope_out` | 明确排除项（对齐 CHANGE `scope.excludes`） |
| `acceptance_criteria` | ≥1 条；`id` + `description`；Given/When/Then 写在 description |
| `functional_requirements` | 可选；按模块组织 |
| `non_functional` | 可选；performance / security / availability |
| `error_rescue_map` | 可选；错误 → 用户可见 → 恢复 |
| `shadow_paths` / `non_happy_path_cases` | 可选；边界与非快乐路径 |
| `dependencies` | 可选；外部依赖与风险 |
| `evidence` | AC 标 `is_checked=true` 时必填 |

### 写作指引（填入 json，render 生成 REQUIREMENT.md）

### 1. 拆 User Stories

从 CHANGE.md Motivation + Scope 拆出用户故事。每条用标准格式：

```
## US-{N}: {标题}

As a **{角色}**
I want **{功能}**
So that **{价值}**

### Acceptance Criteria

**AC-{N}.{M}**: {描述}
Given {前置条件}
  When {操作}
  Then {预期结果}
```

**要求**：
- 每条 US 必须能追踪到 CHANGE.md 的 Motivation 或 Scope
- US 不写技术方案（不在需求层说"用 Redis"）

### 2. 写 AC（Acceptance Criteria）

每条 AC 使用 Given/When/Then 格式：

```
**AC-1.1**: 用户输入有效邮箱能通过验证
Given 用户输入了 "user@example.com"
  When 系统校验邮箱格式
  Then 返回验证通过
```

**好 AC**：
- 可量化（"返回 200"、"耗时 < 200ms"、"响应体包含字段 X"）
- 包含边界值（空输入、超长字符串、特殊字符、分页极限）
- 描述外部可见行为，不涉及内部实现
- 包含中间状态（Loading → Success / Error）
- 错误路径有明确可观测结果（HTTP 4xx / toast 提示 / 按钮置灰）

**好 AC 例子**：
- ✅ "用户点击重置后，表单所有字段恢复到初始空值状态"
- ✅ "搜索耗时 > 5s 时，页面展示 '搜索超时' 提示，搜索框不清空可重试"
- ✅ "删除确认弹窗点击取消，关闭弹窗且列表不刷新"
- ✅ "页面数据加载中，表格区域显示骨架屏，不显示空表头"
- ✅ "连续两次提交相同表单，第二次收到 409 Conflict，页面不跳转"
- ✅ "翻到最后一页时，加载更多按钮变为灰色文字'已加载全部'"

**坏 AC**：
- ❌ "校验通过"（不可验证——什么校验？校验什么？）
- ❌ "使用正则表达式验证"（在描述实现，不是行为）
- ❌ "应该正常工作"（不可测量——什么叫正常）
- ❌ "系统处理请求"（太泛，没有可观测结果）
- ❌ "调用翻译 API"（在描述内部调用链，不是用户可见行为）
- ❌ "不做过多处理"（模糊，无法写断言）
- ❌ "程序运行稳定"（无法在一次测试中验证）
- ❌ "修复以前的问题"（引用非本次 scope）
- ❌ "加好注释"（代码规范，不是 AC）

### 3. 提取域语言

从 US + AC 中提取关键术语，写入 REQUIREMENT.md preamble：

```
## 域语言

| 术语 | 定义 | 使用场景 |
|------|------|---------|
| TranslationRequest | 用户提交的翻译请求 | US-1, US-2 |
| TranslationDirection | 翻译方向枚举（dev→product 等） | US-3 |
```

**要求**：
- 域语言是代码中一致的命名来源
- 跨 change 的术语应保持一致（检查已有 CONTEXT.md）

### 4. Traceability

建立 AC ↔ CHANGE Success Criteria ↔ 验证方式的追踪表：

```
## Traceability

| AC | CHANGE SC | 验证方式 |
|----|-----------|---------|
| AC-1.1 | SC-1（API 返回 200） | curl -s -w '%{http_code}' POST /api/translate |
| AC-2.1 | SC-2（SSE 流式响应） | curl -N -s POST /api/translate/stream |
```

**要求**：
- 每条 CHANGE Success Criteria 至少对应 1 条 AC
- 验证方式必须是可执行命令（不是"写测试"）

---

## 过关（Harness）

1. 逐项检查 `## 质量自检`；有未通过项则不要过关。
2. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 解析 `engineTruth`（`qualityReady` / `blockers`）。
3. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug>`。
4. 过关后再 `status --json --compact`，读 `engineTruth`；若 `currentPhase` 已变为 `design`，切换到 taiyi-design Skill 并通知用户。

Legacy：`npx taiyi complete <slug> requirement` 仍可用；聊天优先 `/taiyi:continue`。

## 产出

- `.taiyi/changes/<slug>/REQUIREMENT.md`
- `.taiyi/changes/<slug>/requirement.json`

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-design` | User Stories → 方案必须覆盖的功能；AC → 设计决策的验收标准；域语言 → 代码中一致的术语 |
| `taiyi-test` | AC（Given/When/Then）→ 第 1 轮功能测试的用例来源；Traceability → 测试覆盖范围 |

## 异常处理

| 场景 | 处理 |
|------|------|
| `continue` 被拒 | 检查 Traceability 是否缺失（AC↔CHANGE SC）、AC 是否可量化。修复后 status 再 continue。**最多 1 次自动重试** |
| CHANGE 未过关（phase guard） | 告知用户 change 阶段未完成，无法继续 |
| US 与已有 change 的 US 重叠 | 标注引用关系，避免重复或冲突的 AC |
| 域语言与已有 CONTEXT.md 冲突 | 使用已有术语，**不要另起一套命名**。记录到 Traceability |
| 误过关本阶段或后续 | `scripts/taiyi-forge.sh undo <slug> requirement`（回滚本阶段及之后已完成阶段） |

<fatal_constraints>
- NEVER write vague AC (no quantifiable criteria).
- NEVER write technical solutions in requirement.json / rendered REQUIREMENT.md.
- NEVER skip Traceability (AC↔CHANGE SC↔verification method).
- NEVER invent User Stories that don't trace back to CHANGE.md Motivation or Scope.
- NEVER use domain language that contradicts existing CONTEXT.md.
</fatal_constraints>

## 质量自检

- [ ] 前置门禁已通过（0.1–0.3）
- [ ] 每条 User Story 有 As a / I want / So that
- [ ] 每条 AC 用 Given/When/Then 格式
- [ ] Traceability 完整（AC ↔ CHANGE Success Criteria ↔ 验证方式）
- [ ] 域语言已提取并与已有术语一致
- [ ] 每条 FR 已声明 trigger（谁调用、什么时机）；caller 不在 scope 的已填 blocked_by
- [ ] 没有写入技术实现方案
- [ ] 每条 AC 可量化（不是"应该正常"）

## 引擎门控（自动，无需手动确认）

- **blocked_by 验证**: requirement.json 中 FR 的 blocked_by 指向不存在的 change → 阻止过关。指向未完成的 change → 日志 warn
