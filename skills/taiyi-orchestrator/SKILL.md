---
name: taiyi-orchestrator
description: TaiyiForge 统一入口 — 意图解析、阶段路由、Token预算、工件预检。Use when 用户说"开始/继续/审查/测试/设计"等流程相关意图。
paradigm: Navigator
---

<constraints>
SYSTEM OF RECORD: `taiyi status --json --compact` 的 `engineTruth.currentPhase` 是阶段状态的唯一来源。
DO NOT infer current phase from conversation history.
DO NOT anticipate or prepare artifacts for future phases.
If engineTruth shows a different phase than what you recall, trust engineTruth — halt and reload.
PHASE GUARD: If the user's request involves writing/reading code but engineTruth says they are NOT in dev phase, halt and ask: "当前处于 [phase] 阶段，不能直接操作代码。你是要切换到 dev 阶段，还是先完成当前阶段？"
</constraints>

# taiyi-orchestrator

<constraint>This is a ROUTER ONLY. Your job ends after Step 8 — do NOT execute scripts/taiyi-forge.sh or any shell command directly. DO NOT implement code, run tests, or write artifacts. Once you have loaded the phase skill and output the route declaration, your work is done.</constraint>

## Goal
解析用户意图，自动：1) 读项目状态 2) 工件前置检查 3) 意图路由 4) Token预算估选挡位 5) 路由声明 6) 进入对应Skill

## Workflow

### 第一步 · 读取项目状态（引擎真源）
读 `.taiyi/changes/<slug>/state.json` 的 `currentPhase` / `completedPhases` / `workflowStatus`。
或用 `jq` 提取：`jq -r '{currentPhase, completedPhases, workflowStatus}' .taiyi/changes/<slug>/state.json`
**这是阶段状态的唯一真源，不是对话记忆。**

### 第二步 · Artifact Preflight Gate
路由前检查上游工件是否齐全，缺失→回退补齐。

### 第三步 · Token预算 + 挡位
估算token消耗，让用户选挡位（完整/极简/单点/不走flow）。成本因子：前端+20%、schema变更+10%、task<3→-30%、task>10→+50%

### 第四步 · 老项目入场检测
探测 AGENTS.md / CLAUDE.md / .cursor/rules/ 等已有AI文档，反问用户处理方式。

### 第五步 · 意图匹配 & 路由（含跨阶段防护）
- 按关键词匹配阶段（继续→dev、审查→review、测试→test、设计→design等）
- **跨阶段防护**：如果用户请求涉及**代码改动/测试/审查**，但 engineTruth 当前阶段不是 dev/test/review，则 HALT 并提问："当前处于 [phase] 阶段。你要先完成当前阶段，还是手动切换到 [匹配] 阶段？"
- 如果用户请求与当前阶段无关（如问项目架构），允许——不阻挠纯信息问题。

### 第六步 · 路由声明（必须）
进入前输出：路由/Change-ID/已加载/未加载/Token预算/第一动作

### 第七步 · 加载工件策略
每阶段标注必读vs按需，控制token消耗。优先读 `.taiyi/changes/<slug>/PHASE-CONTEXT.md`（~500 tokens），不要全量加载上游工件。

### 第八步 · 执行对应Skill（附关闭协议）
- 加载当前阶段的 Skill（`taiyi-change` … `taiyi-integration`）
- **进入 phase skill 后 orchestrator 职责结束**。从此刻起你的任务是 phase skill 中的阶段步骤，不要再返回 orchestrator 的路由/预算/挡位决策逻辑。
- 如果刚刚执行了 `continue` 并成功：**立即重新读取 engineTruth**。如果 `currentPhase` 已变化，切换到新阶段的 Skill 并通知用户。不要继续用旧阶段逻辑处理。

## Paradigm标注
| Skill | Paradigm |
|-------|----------|
| taiyi-change/requirement | Partner |
| taiyi-design/ui-design | Architect |
| taiyi-task | Navigator |
| taiyi-dev/test/integration | Operator |
| taiyi-review/health | Scout |

## 质量自检
- [ ] 当前 route 声明已输出
- [ ] engineTruth.currentPhase 已确认
- [ ] 上游工件齐全（Preflight 通过）
- [ ] 当前阶段 Skill 已加载
- [ ] 用户意图与当前阶段不冲突（或已 halt 提问）

## 异常处理
- `continue` 返回非零：读错误输出 → 判断是门禁失败还是引擎崩溃。门禁失败 → 展示阻挡项，让用户决策。引擎错误 → 上报用户。
- 对话状态与 engineTruth 冲突：**始终信任 engineTruth**。以 engineTruth 为准重新初始化上下文。
- 用户请求与当前阶段矛盾：触发跨阶段防护（第五步），**不静默执行**。
- continue 成功后 phase 已变但 Agent 未觉察：Agent 自行 re-read engineTruth，切换到正确 Skill（第八步）。

<fatal_constraints>
- NEVER execute scripts/taiyi-forge.sh directly — you are a router, not an executor.
- NEVER skip Artifact Preflight.
- NEVER skip token budget estimation.
- NEVER skip route declaration.
- NEVER fake "preflight passed" when artifacts are missing.
- NEVER execute code-phase actions (write/edit/test) when engineTruth shows a non-dev/test phase without halting first.
</fatal_constraints>
