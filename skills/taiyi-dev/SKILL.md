---
name: taiyi-dev
description: TaiyiForge 第6阶段 — TDD开发执行。四端通用。
paradigm: Operator
---

# taiyi-dev — TDD 开发

> 进入本阶段前请优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

## 框架集成

本阶段使用以下框架：

| 框架 | 用途 | 何时加载 |
|------|------|---------|
| **Harness** | 阶段门禁与推进（`apply` 清单 · `status` → `continue`；legacy：`npx taiyi apply/complete`） | 全程 |
| **Superpowers** | `test-driven-development` — TDD 红→绿→重构循环 | 步骤 1（强制） |
| **Superpowers** | `systematic-debugging` — 测试失败时诊断 | 异常处理时 |
| **Superpowers** | `verification-before-completion` — 完成前验证 | 完成前 |

**GStack / OpenSpec / Spec-Kit / OMO** 在本阶段不涉及。

## 前置门禁（Pre-flight）

### 0.1 上游确认
- task 阶段已过关（`engineTruth` 确认）
- TASK.md 中无未解决的 `[depends_on: ?]`
- 当前 git 分支干净（无未提交的临时修改）

### 0.2 Profile 判定

| Profile | 开发要求 |
|---------|---------|
| `full` | 全 TDD（红→绿→重构）+ 全部 0.x 检查 + self-review(R1-R11) |
| `api/ui` | 同 full |
| `lite` | TDD 可选，0.x 检查中的 0.5（破坏性变更）必须执行 |
| `micro/spike` | 仅 0.1（grep 已有抽象）+ 0.5（破坏性变更） |
| `nano` | TDD 可选，0.5 必须执行 |

### 0.3 前置检查清单
- [ ] task 阶段已过关
- [ ] todo 列表已就绪（每个 T0X 一个 todo 项）
- [ ] 理解 TASK.md 的 verify 标准和 write_files 边界

---

## 步骤

**dev 无 json 视图**：过关证据为 `.dev-complete`（`command` + `exitCode: 0`）。实现边界仍来自 `task.json` / 渲染后的 `TASK.md`。

### 0. 上下文加载

先读 PHASE-CONTEXT.md 确认范围，再读 TASK.md 拿到任务清单。**不写不在 TASK 中的功能。**

### 0.1 沿用已有抽象 grep（强制）

写新代码前 grep 同类模式，贴入 SUMMARY：

```
# grep -rn "class.*Adapter" src/  → 找到 LLMAdapter 抽象基类
# grep -rn "from.*middleware" src/ → 找到 LoggingMiddleware 模式
```

**不 grep 直接写 = 制造重复抽象**。

### 0.2 扫 LESSONS（强制）

```
grep -rn "LESSON" .taiyi/changes/<slug>/ 2>/dev/null || echo "无 LESSONS"
```

对 active 条目声明差异。相同方案已记录失败教训 → **停手，选不同方案**。

### 0.3 UI 任务额外检查

确认 UI-DESIGN.md 存在。颜色/字体/间距从 UI-DESIGN.md 派生。**禁硬编码 hex**。

### 0.4 Schema 变更检查

生成可逆迁移（up + down）。grep 确认数据库当前结构，避免迁移冲突。

### 0.5 破坏性变更高门槛

命中任一 → **STOP，展示引用分析结果，等用户明确指示**：
- 删除 ≥ 5 行代码
- 修改公共导出（export function / export class）
- 改 API 端点签名（path / method / request body）
- 改 DB Schema 列名或类型

---

### 1. TDD 红→绿→重构（强制）

<tdd_enforcement>
STEP A — WRITE FAILING TEST ONLY
  - Write the test that defines the expected behavior. Do NOT touch business logic yet.
  - The test MUST be a real assertion (not console.log, not TODO).

STEP B — CAPTURE RED EVIDENCE（MANDATORY）
  - Run the test script. Capture the RED (failing) terminal output.
  - PASTE the failing output into .dev-complete as evidence under "RED: <test-id>".
  - DO NOT proceed to step C without RED evidence.

STEP C — IMPLEMENT GREEN
  - Write the minimum production code to make the test pass.
  - Re-run the exact same test. Capture GREEN (passing) output.
  - Paste GREEN output into .dev-complete alongside the RED evidence.

STEP D — REFACTOR
  - Optional cleanup. Tests MUST stay green.

<three_case_rule>
最低测试覆盖 (强制) — 每个新函数必须 ≥ 3 个 test case:
  1. happy case — 正常输入返回预期输出
  2. edge case — 边界输入 (空/null/0/最大值/Unicode/...)
  3. error case — 异常输入 (类型错/null/无效格式) 走 error 处理分支

禁止单 case 提交. 三个 case 缺一即视为覆盖不足.

反模式 (禁止):
  - 只测 happy path 不测边界
  - console.log / TODO 代替断言
  - 把 3 个 case 写成"复用同一断言"的循环 (虽然技术正确但语义模糊)
</three_case_rule>
</tdd_enforcement>

**TDD 违规处理**：Agent 跳过 RED 证据直接写实现 → 删除实现代码，回退到 A 步。

### 2. 提交前 diff 边界 verify

```
git diff --stat
```

与 TASK.md 各任务 `write_files` 逐条比对：
- ⚠️ 增改文件超出 write_files → **STOP**，记录范围蔓延
- ⚠️ 修改了禁动清单中的文件 → **STOP**，回退修改

### 3. Self-review（R1-R11）

每条诊断格式：`Symptom → Source → Consequence → Remedy + 文件:行号`

| 维度 | 检查项 | 命中条件 |
|------|--------|---------|
| **R1 函数过载** | 函数/方法 > 40 行 | 超过拆分为 2+ 函数 |
| **R2 文件膨胀** | **单个源文件 > 1000 行**（不含测试和配置文件） | 拆为多个模块 |
| **R3 变更传播** | 修改公共接口导致 3+ 文件连锁改动 | **STOP**，重新设计接口 |
| **R4 知识重复** | 3+ 处实现同一逻辑 | 提取为共享函数 |
| **R5 偶然复杂** | 不必要的配置/抽象/泛型 | 简化或删除 |
| **R6 依赖混乱** | A 层直接引用 B 层内部类型 | 用接口解耦 |
| **R7 领域扭曲** | 代码命名与 REQUIREMENT 域语言不一致 | 统一术语 |
| **R8 嵌套过深** | 条件/循环嵌套 > 4 层 | 提前 return / 提取函数 / 策略模式 |
| **R9 循环依赖** | 模块 A↔B 互相 import | 提取共享接口到独立文件 |
| **R10 沉默错误** | 空 catch、await 无 try、Promise 不 catch | 补错误处理（至少 log） |
| **R11 魔术值** | 硬编码字符串/数字（非配置/常量） | 提取为命名常量或 config key |

### 4. SUMMARY + .dev-complete

写入 `.taiyi/changes/<slug>/.dev-complete`：

```
# .dev-complete

## TDD 证据
### T01: validateEmail
RED:
$ npx vitest run tests/unit/validation.test.ts
# 粘贴 red 输出
GREEN:
$ npx vitest run tests/unit/validation.test.ts
# 粘贴 green 输出

## 0.x 检查
- [x] 0.1 grep 已执行：找到 Adapter 模式
- [x] 0.2 LESSONS 已扫描：无冲突
- [x] 0.5 破坏性变更：否

## Self-review
- R1 函数过载: ✅
- R2 文件膨胀: ✅ (180 行)
- R3 变更传播: ⚠️ 修改了公共接口 → 重新设计
- ...

## 偏差
预估：T01(30min) + T02(2h) = 2.5h
实际：T01(20min) + T02(3h) = 3.2h
偏差：+28% — T02 因方案调整超时
```

---

## 过关（Harness）

1. 逐项检查 `## 质量自检`；有未通过项则不要过关。
2. 可选清单：`scripts/taiyi-forge.sh apply <slug> dev`（只输出实现清单，**不过关**）。
3. 预检：`scripts/taiyi-forge.sh status <slug> --json --compact` — 解析 `engineTruth`（`qualityReady` / `blockers`）。
4. 用户确认后过关：`scripts/taiyi-forge.sh continue <slug>`。
5. 过关后再 `status --json --compact`，读 `engineTruth`；若 `currentPhase` 已变为 `test`，切换到 taiyi-test Skill 并通知用户。

Legacy：`npx taiyi apply <slug> dev` 或 `npx taiyi complete <slug> dev` 仍可用；聊天优先 `/taiyi:apply` · `/taiyi:continue`。

## 产出

- `.taiyi/changes/<slug>/TASK.md`（参考）
- 实现代码（在项目中）
- `.taiyi/changes/<slug>/.dev-complete`

## 与下游衔接

| 下游 | 需要 |
|------|------|
| `taiyi-test` | 实现代码 → 测试目标；TASK verify 标准 → 测试预期；.dev-complete → 偏差追踪 |
| `taiyi-review` | 实现代码 → 审查对象；diff → 范围蔓延检测基线 |

## 异常处理

| 场景 | 处理 |
|------|------|
| 测试失败 | DIAGNOSE（读失败输出 + stack trace）→ 写 FIX 计划 → 最小改动修复 → 重跑所有测试。**最多 3 轮**，超限停手上报用户 |
| compile/lint 错误 | 读错误输出的文件行号 → 逐条修复。**不要**整文件重写或 rewrite from scratch |
| 门禁不通过 | 读 `engineTruth` 确认当前阶段。若是前阶段工件未满足 → 展示缺什么文档，让用户决定回退 |
| 任何破坏性变更（0.5 协议命中） | STOP，展示引用分析结果，等用户明确指示 |
| TDD 阶段发现 TASK 任务拆分不合理 | 在 .dev-complete 中记录偏差，**不要**中途改 TASK.md。等 review 阶段处理 |
| 多个任务共享同一个文件 | 标记为"写冲突"，**只能串行执行**。先完成的任务提交后，后一个任务 rebase |
| 非零 exit code | 最多 1 次自动重试，第二次必须等用户指令 |
| 误过关本阶段或后续 | `scripts/taiyi-forge.sh undo <slug> dev` |

<fatal_constraints>
- NEVER mark complete without verification passing.
- NEVER skip 0.5 protocol for breaking changes.
- NEVER write new code without first grepping for existing patterns.
- NEVER add features not listed in TASK.md — scope is frozen at dev entry.
- NEVER modify files under `~/.config/opencode/skills/` or `.claude/skills/` — these are prompt files, not project code.
- NEVER skip RED evidence capture in TDD.
- NEVER suppress or delete failing tests to "pass" CI.
</fatal_constraints>

## 质量自检

- [ ] 前置门禁已通过（0.1–0.3）
- [ ] 0.1 grep 已执行并贴入 .dev-complete
- [ ] 0.2 LESSONS 已扫描（或声明无冲突）
- [ ] 0.5 破坏性变更已处理（或声明无）
- [ ] TDD 红→绿证据已贴在 .dev-complete
- [ ] 提交前 diff 与 TASK write_files 一致
- [ ] Self-review R1-R11 全部 ✅（如命中则记录了 Remedy）
- [ ] 单个源文件未超过 1000 行（R2 无 ⚠️）
- [ ] 无隐蔽的循环依赖、空 catch、魔术值（R9-R11 无 ⚠️）
- [ ] 所有测试通过
- [ ] .dev-complete 已写入
- [ ] 预估 vs 实际偏差已记录

## 引擎门控（自动，无需手动确认）

- **TDD 检查**: .dev-complete 必须含测试命令或 .test.ts 引用 → 阻止
- **scope boundary**: 修改文件不超出 CHANGE.md 范围 → 阻止
- **architecture**: 代码结构符合架构模板 → 阻止
