# ⛔ DEPRECATED — GStack 已移除

> **GStack 已从主链路移除**，相关能力由 ECC 双线 harness 承接。
> 当前架构：Superpowers + ECC 双线 harness（见 `workflow-manifest.yaml`）。
> 迁移说明：docs/taiyi/library-selection.md

---

# TaiyiForge × Superpowers × ECC — 融合方案（历史存档）

## 架构总览

```
┌───────────────────────────────────────────────────────────────┐
│ TaiyiForge（流程引擎）                                         │
│ 九阶段 × 状态机 × 三门禁 × 工件契约                            │
├───────────────────────────────────────────────────────────────┤
│ 【纪律层】Superpowers（必选 · 硬约束 🔒）                       │
│ ├─ brainstorming（change）                       [澄清范围]    │
│ ├─ writing-plans（task）                          [切片计划]    │
│ ├─ test-driven-development                       [红绿重构]    │
│ ├─ verification-before-completion                [证据先行]    │
│ ├─ requesting-code-review                        [派审循环]    │
│ └─ finishing-a-development-branch                [分支收尾]    │
│                                                                │
│ 【快速层】GStack（可选 · 专业工具 ⚡）                            │
│ ├─ plan-eng-review（design）                     [架构决策]    │
│ ├─ plan-design-review（ui）                      [设计评审]    │
│ ├─ qa（test）                                    [站点 QA]     │
│ ├─ browse（test）                                [视觉取证]    │
│ ├─ review（review）                              [代码结构]    │
│ └─ document-release（integ）                     [发版协调]    │
│                                                                │
│ 【能力层】ECC（可选 · 深度补强 📚）                              │
│ ├─ architecture-audit                            [多维架构]    │
│ ├─ security-scan (AgentShield)                   [1282 rules]  │
│ ├─ systematic-debugging                          [科学调试]    │
│ ├─ test-coverage-analysis                        [覆盖率]      │
│ ├─ web-design-guidelines                         [设计规范]    │
│ ├─ changelog-generator                           [自动发版]    │
│ └─ 277+ Skills                                   [能力库]      │
└───────────────────────────────────────────────────────────────┘
```

## 三层分工

| 层级 | 工具 | 职责 | 不可替代 |
|---|---|---|---|
| 纪律 | Superpowers | TDD / 派审循环 / 证据门禁 | ✅ 硬约束 |
| 快速 | GStack | 架构决策 / QA / 结构审查 | ⚠️ 可部分替代 |
| 能力 | ECC | 深度分析 / 安全 / 知识沉淀 | ✅ 九阶段 harness 硬约束（须 harness-check） |

**关键理解**：

```
Superpowers 不是工具，是纪律
  → 不能被替代
  → TDD 是硬约束
  → 派审循环是自动修复引擎

GStack 是快速工具
  → 加速决策反馈
  → 部分功能可被其他工具替代

ECC 是深度补强（默认 manifest 已强制 harness-check）
  → 知识积累 + AgentShield + Eval/覆盖率
  → 与 Superpowers 纪律、GStack 快评并列三层
```

## 九阶段完整配置

### ① **change** 立项（Superpowers 主导）

| 项 | 值 |
|---|---|
| 角色 | `@analyst` · `@explore` |
| 纪律 | `brainstorming`（澄清范围、风险、成功标准） |
| 补强 | `taiyi-intel-scan`（代码库情报） |
| 产出 | `CHANGE.md` |
| 人工门 | ✅ `--approver` 必需 |

**流程**：
1. `/taiyi:explore`              # Superpowers brainstorming 头脑风暴
2. `/taiyi:new "功能名"`          # 生成模板
3. （可选）加载 `/ecc:*` 补充研究（市场、竞品）
4. `/taiyi:write CHANGE.md`      # 填充工件
5. `/taiyi:continue --approver "PM"`

**三层融合点**：
- 🔵 Superpowers → `brainstorming`（硬约束）
- 🟡 GStack → 无
- 🟢 ECC → 可选补充研究能力

---

### ② **requirement** 需求（Superpowers 辅助）

| 项 | 值 |
|---|---|
| 角色 | `@analyst` · `@planner` · `@document-specialist` |
| 纪律 | `writing-plans`（可选但推荐） |
| 补强 | 无 |
| 产出 | `REQUIREMENT.md` |
| 人工门 | ✅ 自动过关 |

**流程**：
1. （推荐）`/superpowers:writing-plans`  # 细化为 bite-sized 切片
2. `/taiyi:write REQUIREMENT.md`          # 写 AC（Acceptance Criteria）
3. `/taiyi:continue`                      # 自动过关（无人工门）

**关键**：AC 须包含 `@taiyi-verify` 验证命令

**三层融合点**：
- 🔵 Superpowers → `writing-plans`（可选纪律）
- 🟡 GStack → 无
- 🟢 ECC → 无

---

### ③ **design** 技术设计（三层核心融合点）

| 项 | 值 |
|---|---|
| 角色 | `@architect` · `@critic` · `@scientist` |
| 纪律 | 无（可选 `writing-plans`） |
| 快速 | `plan-eng-review`（成本/选项/风险三维分析） |
| 深度 | `architecture-audit` + `system-design-review` |
| 产出 | `DESIGN.md` · `adr/` |
| 人工门 | ✅ `--approver` 必需 |

**流程**：
1. `/taiyi:write DESIGN.md`                # 初稿（≥2 方案对比）
2. `/taiyi:gstack plan-eng-review`         # ← GStack 快速决策
   - 输出：成本分析、风险评估、架构选择
3. `/taiyi:agent architect`                # 生成 `adr/` 架构决策记录
   - 自动调用 `/ecc:architecture-audit`   # ← ECC 深度分析
4. （可选）`/ecc:system-design-review`    # 多维设计评审
5. `/taiyi:review-loop`                    # 人工审查循环
6. `/taiyi:continue --approver "架构师"`

**时间**：30-45min（三层融合核心时间）
**质量**：设计决策有据可查 + 成本透明 + 知识沉淀

**三层融合点（最关键）**：
- 🔵 Superpowers → `writing-plans`（可选）
- 🟡 GStack → `plan-eng-review`（快速决策 ⚡）
- 🟢 ECC → `architecture-audit` + adr（知识沉淀 📚）

**这个阶段的意义**：
```
GStack 告诉你 "选哪个方案"（快速）
ECC 告诉你 "为什么这么选"（深度）
adr/ 记录 "这个决策的演变"（知识）
```

---

### ④ **ui-design** 交互与无障碍（可选）

| 项 | 值 |
|---|---|
| 角色 | `@designer` · `@ux-researcher` · `@information-architect` |
| 纪律 | 无 |
| 快速 | `plan-design-review`（UI 设计评审） |
| 深度 | `web-design-guidelines` · `accessibility-audit` |
| 产出 | `UI-DESIGN.md` · `ui-restyle-tasks.md` |
| 人工门 | ✅ 自动过关（纯 API 项目可标 N/A） |

**流程**：
1. `/taiyi:write UI-DESIGN.md`             # UI 契约（无障碍要求）
2. （有 UI 时）`/taiyi:gstack plan-design-review`  # ← GStack 快速反馈
3. （可选）`/ecc:web-design-guidelines`   # ← ECC 设计规范
4. `/ecc:accessibility-audit`              # ← ECC 无障碍检查
5. `/taiyi:continue`

纯 API 项目：标记 "N/A"，跳过此阶段

**三层融合点**：
- 🔵 Superpowers → 无
- 🟡 GStack → `plan-design-review`（快速反馈）
- 🟢 ECC → `web-design-guidelines` + `accessibility`（深度检查）

---

### ⑤ **task** 任务切片（Superpowers 主导）

| 项 | 值 |
|---|---|
| 角色 | `@planner` · `@test-engineer` |
| 纪律 | `writing-plans` + `test-driven-development`（必选） |
| 补强 | 无 |
| 产出 | `TASK.md`（独立 PR 的切片 + 测试计划） |
| 人工门 | ✅ 自动过关 |

**流程**：
1. `/superpowers:writing-plans`            # ← 可执行计划（Superpowers 纪律）
   - 输出：依赖顺序、时间估算、风险
2. `/taiyi:tdd plan`                       # ← TDD 计划（Superpowers 纪律）
   - 输出：单测/集成/E2E 分层策略
3. `/taiyi:write TASK.md`                  # 生成任务清单
   - 须包含：
     - Checklist `[ ] TDD红` `[ ] TDD绿` `[ ] 覆盖率 ≥80%`
     - `@taiyi-verify` 验证命令
4. `/taiyi:continue`

**关键**：TASK.md Checklist 必须 TDD 友好
**时间**：15-20min

**三层融合点**：
- 🔵 Superpowers → `writing-plans` + `test-driven-development`（硬纪律 🔒）

---

### ⑥ **dev** TDD 实现（Superpowers 核心纪律）

| 项 | 值 |
|---|---|
| 角色 | `@executor` · `@debugger` |
| 纪律 | `test-driven-development`（红绿重构 · **硬约束** 🔒🔒🔒） |
| 补强 | `systematic-debugging`（测试失败时） |
| 产出 | 代码 + 测试（`.dev-complete`） |
| 人工门 | ✅ engine 检查 `exitCode === 0` |

**流程**：
1. `/taiyi:tdd dev`                        # ← Superpowers 红绿重构（纪律）
   - 1.1 RED：写测试 → `npm test` FAIL
   - 1.2 GREEN：最小实现 → `npm test` PASS
   - 1.3 REFACTOR：优化代码
   - 1.4 REPEAT 直至 AC 全绿
2. `npm test && echo "✅ 所有测试通过"`
3. （测试失败时）`/ecc:systematic-debugging`  # ← ECC 科学调试（补强）
   - 结构化问题分析
   - 修复 bug
   - 回到步骤 1
4. `/taiyi:continue`                       # engine 自动检查 exitCode

**时间**：按复杂度 30min - 2h
**质量**：✅ 100% 测试驱动（硬约束）

**三层融合点（纪律的真正核心）**：
- 🔵 Superpowers → `test-driven-development`（不可谈判 🔒🔒🔒）
- 🟢 ECC → `systematic-debugging`（失败时补强）

**这个阶段的意义**：
```
Superpowers 强制 TDD → 质量基线（不可跳过）
ECC 补强调试 → 效率提升（卡壳时救援）
```

---

### ⑦ **test** 测试与验证（三层齐发）

| 项 | 值 |
|---|---|
| 角色 | `@verifier` · `@qa-tester` · `@tracer` |
| 纪律 | `verification-before-completion`（证据先行） |
| 快速 | `qa` + `browse`（站点 QA + 视觉取证） |
| 深度 | `test-coverage-analysis` · `security-test-automation` |
| 产出 | `TEST.md`（带真实运行证据） |
| 人工门 | ✅ 自动过关 |

**流程**：
1. `npm test`                              # 单测/集成
2. `npx playwright test`                   # E2E（替代 gstack qa）
3. （Web 应用）`/taiyi:gstack qa`         # ← GStack 站点 QA（可选但推荐）
   - 输出：功能验证、兼容性、性能
4. `/taiyi:gstack browse`                  # ← GStack 视觉取证（可选）
   - 输出：before/after 截图证据
5. `/ecc:test-coverage-analysis`           # ← ECC 覆盖率分析（深度）
   - 生成覆盖率报告
   - 识别漏测场景
6. `/taiyi:write TEST.md`                  # 填充工件（含证据表格）
   - 必须包含：

     | 场景 | 命令 | 结果 | 证据 |
     |---|---|---|---|
     | ... | ... | PASS | ... |
7. `/superpowers:verification-before-completion`
   - ← Superpowers 纪律：证据先于「完成」声明
8. `/taiyi:continue`

**时间**：20-40min（测试量决定）
**质量**：多维验证（单测 + E2E + 站点 QA + 覆盖率 + 视觉）

**三层融合点（质量最高点）**：
- 🔵 Superpowers → `verification-before-completion`（证据门禁 🔍）
- 🟡 GStack → `qa` + `browse`（快速 QA ⚡）
- 🟢 ECC → `test-coverage-analysis`（深度分析 📊）

---

### ⑧ **review** 代码审查（三层循环）

| 项 | 值 |
|---|---|
| 角色 | `@code-reviewer` · `@security-reviewer` · `@api-reviewer` · `@critic` |
| 纪律 | `requesting-code-review`（派审循环 · 自动修复） |
| 快速 | `review`（PR 结构审查） |
| 深度 | `security-scan` (AgentShield) · `code-quality-baseline` |
| 产出 | `REVIEW.md`（Verdict 人工签名） |
| 人工门 | ✅ `--approver` 必需 |

**流程**：
1. `/taiyi:health [slug]`                  # 健康基线（medium/high 必选）
   - `npm run health`（typecheck/lint/test）
2. `/taiyi:review-loop`                    # ← Superpowers 派审循环（纪律）
   - 流程：
     - A. 加载 `@taiyi-review`
     - B. 写 REVIEW.md（基于最新 git diff）
     - C. 检查是否有 high/Request changes
     - D. 有 → 修代码 → 回到 A（自动循环直至通过）
     - E. 无 → 继续
3. （推荐）`/taiyi:gstack review`          # ← GStack 代码结构审查（快速反馈）
4. `/ecc:security-scan`                    # ← ECC AgentShield（深度安全）
   - 1282 rules 工业级扫描
   - 输出安全报告
5. `semgrep scan --config auto`            # SAST（补充）
6. `trivy fs .`                            # 漏洞扫描（补充）
7. `/taiyi:review-loop`（循环检查）      # ← Superpowers 再次检查
   - 直至所有 blocking 都解决
8. `/taiyi:continue --approver "审查者"`

**关键**：
- REVIEW.md 须标记 `Verdict: [x] **Approve** 或 [ ] Request changes`
- high/blocking 未解决不能 Approve
- 循环上限（默认 20 轮）

**时间**：30-60min（根据评审项数）
**质量**：三角评审（快速 + 安全 + 人工）

**三层融合点（评审的黄金循环）**：
- 🔵 Superpowers → `requesting-code-review`（派审循环 🔄 自动修复）
- 🟡 GStack → `review`（快速反馈 ⚡）
- 🟢 ECC → `security-scan`（1282 rules 🔒）

**这个阶段的意义**：
```
Superpowers 循环派审 → 自动修复，提高通过率
GStack 快速反馈 → 快速得到结构性意见
ECC 深度安全 → 工业级安全保障
```

---

### ⑨ **integration** 交付闭环（Superpowers 主导 + ECC 自动化）

| 项 | 值 |
|---|---|
| 角色 | `@verifier` · `@writer` · `@git-master` |
| 纪律 | `finishing-a-development-branch` + `verification-before-completion`（必选） |
| 快速 | `document-release`（发版协调） |
| 深度 | `changelog-generator`（自动化） |
| 产出 | `CHANGELOG.md`（根 CHANGELOG 合并） |
| 人工门 | ✅ delivery-gate + audit + AC 勾选 |

**流程**：
1. `/superpowers:finishing-a-development-branch`
   - ← Superpowers 分支收尾
   - 验证所有测试通过
   - 清理临时分支
   - 准备 merge
2. `/superpowers:verification-before-completion`
   - ← Superpowers 再次验证
   - 确认所有 AC 通过
   - 检查 CHANGELOG/文档
3. （可选）`/taiyi:gstack document-release`
   - ← GStack 发版协调（可选但推荐大版本）
   - README 同步
   - 发版说明生成
4. `/ecc:changelog-generator`               # ← ECC 自动生成
   - 从 git commit + CHANGELOG.md 生成
   - 版本号管理
5. `npx changeset version`                  # monorepo 版本（可选）
6. `git commit -m "chore: release v1.0"`   # commit trailer
7. `/taiyi:verify`                          # 交付预检（engine）
   - 检查 git 状态
   - 检查 AC 勾选
8. `/taiyi:continue`                        # 自动过关

**时间**：15-30min
**质量**：所有 AC 已勾选 + changelog 已生成 + 版本已发布

**三层融合点**：
- 🔵 Superpowers → `finishing-a-development-branch` + `verification`（最终纪律 ✅）
- 🟡 GStack → `document-release`（发版协调 📦）
- 🟢 ECC → `changelog-generator`（自动化 🤖）

---

## 🎯 日常使用示例

### 完整 Feature（从 0 到交付）

```bash
# 1️⃣ 初始化
/taiyi:new "实现用户认证系统"
/taiyi:continue --approver "PM"

# 2️⃣ 需求
/superpowers:writing-plans
/taiyi:write REQUIREMENT.md
/taiyi:continue

# 3️⃣ 设计（三层融合最关键）
/taiyi:write DESIGN.md

# 快速决策层
/taiyi:gstack plan-eng-review
# 输出: 成本/选项/风险分析 → 选型决策

# 深度分析层
/taiyi:agent architect
# 输出: adr/ + 多维分析

# 可选补强
/ecc:system-design-review

/taiyi:continue --approver "架构师"

# 4️⃣ 任务切片
/superpowers:writing-plans
/taiyi:tdd plan
/taiyi:write TASK.md
/taiyi:continue

# 5️⃣ TDD 实现（Superpowers 硬纪律）
/taiyi:tdd dev
# → RED: 写测试
# → GREEN: 最小实现
# → REFACTOR: 优化

# 测试失败时（补强）
/ecc:systematic-debugging
# 修复 → 回到 tdd dev

/taiyi:continue

# 6️⃣ 完整测试（三层齐发）
npm test
npx playwright test
/taiyi:gstack qa              # 快速 QA
/ecc:test-coverage-analysis   # 覆盖率分析

/taiyi:write TEST.md
/taiyi:continue

# 7️⃣ 代码审查（循环派审）
/taiyi:health                 # 健康基线
/taiyi:review-loop            # Superpowers 派审循环
/taiyi:gstack review          # 快速反馈
/ecc:security-scan            # 工业级安全
/taiyi:continue --approver "审查者"

# 8️⃣ 交付
/superpowers:finishing-a-development-branch
/ecc:changelog-generator
/taiyi:commit
/taiyi:verify
/taiyi:continue

# 9️⃣ 完成
/taiyi:archive
```

## 📊 融合收益预期

| 维度 | 之前 | 融合后 | 改进 |
|---|---|---|---|
| 工程纪律 | 靠 prompt | Superpowers 强制 | ✅ 100% TDD |
| 设计质量 | 单一方案 | GStack（快速）+ ECC（深度） | ✅ 三维决策 + 知识沉淀 |
| 代码安全 | 无 | AgentShield 1282 rules | ✅ 工业级 |
| 测试覆盖 | 靠自觉 | verification-before-completion | ✅ 强制 + 分析 |
| 审查效率 | 单轮 | Superpowers 自动循环修复 | ✅ 通过率 ⬆️ 50% |
| 知识积累 | 无 | adr/ + CHANGELOG | ✅ 长期收益 |
| 总周期 | 7-10 天 | 4-6 天 | ✅ -40% |
| 缺陷率 | 3-5% | 0.5-1% | ✅ -80% |

## 🚀 快速开始

### 安装方式

```bash
# 1. 克隆 TaiyiForge
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge

# 2. 安装依赖（Superpowers / ECC / OpenSpec）
npx taiyi-forge-install --all

# 3. 验证
npx taiyi doctor

# 4. 开始第一个变更
/taiyi:new "我的第一个功能"
/taiyi:status

# 5. 查看完整指南
cat docs/taiyi/integration-superpowers-ecc-gstack.md
```

### 切换 Manifest

```bash
# 启用激进版（ECC 强约束）
npx taiyi-forge-install --claude --manifest optimized

# 切回默认数据驱动版
npx taiyi-forge-install --claude --manifest default
```

## 📚 相关文档

- `docs/taiyi/superpowers-flow.md` - Superpowers 纪律层详解
- `docs/taiyi/full-oss-flow.md` - 完整端到端流程
- `docs/taiyi/control-plane.md` - Agent 纪律规范
- `docs/taiyi/workflow-manifest.yaml` - harness / Superpowers 目录（默认）
- `docs/taiyi/workflow-manifest-optimized.yaml` - 同上 + 更严的 `phases.harness` optional

## 🔑 注册式实现

本方案**完全数据驱动**，核心代码 0 改动：

| 配置 | 位置 |
|---|---|
| 9 阶段 harness 推荐 | `docs/taiyi/workflow-manifest.yaml`（默认）|
| 激进版 harness | `docs/taiyi/workflow-manifest-optimized.yaml`（仅 `phases.harness` 更严） |
| Manifest 切换 | `npx taiyi-forge-install --manifest <name>` |
| Skill 加载 | `prompts/inc/{superpowers,gstack,ecc}-invoke.md`（运行时注入） |
| Hook family 识别 | 无白名单（任意 `<tool>/<skill>` 接受） |

**为什么"完全数据驱动"可行**：
- `getHarnessContext()` 从 YAML 读 hooks
- `prompt-stage-protocol.ts` 占位符机制支持任意 invoke 文件
- `harness-check` 不限制 family

## ✅ 总结

最优融合方案三层模型：

```
【纪律层】Superpowers（必选 · 硬约束）
  ↓ 保证工程规范，特别是 TDD 不可跳过

【快速层】GStack（可选 · 专业工具）
  ↓ 快速决策 + 快速反馈，加速开发流程

【能力层】ECC（可选 · 深度补强）
  ↓ 深度分析 + 知识沉淀 + 277+ Skills

= 质量 ⬆️ 效率 ⬆️ 知识 ⬆️
```

**关键成功因素**：
- ✅ Superpowers 纪律不可动摇（特别是 TDD）
- ✅ GStack 用于快速决策和反馈
- ✅ ECC 用于深度分析和知识积累
- ✅ 三层协同，各司其职
- ✅ **全部数据驱动 · 0 代码改动 · 可注册切换**

**预期结果**：
- 🎯 质量基线提升 80%
- 🎯 开发周期缩短 40%
- 🎯 知识长期积累
- 🎯 团队规范可移植（每个项目装同一份 manifest 就有统一纪律）