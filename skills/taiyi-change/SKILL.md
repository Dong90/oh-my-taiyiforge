---
name: taiyi-change
description: TaiyiForge 第1阶段 — 变更提案，CHANGE.md。四端通用。
paradigm: Partner
---

# taiyi-change — 变更提案

## 步骤

### 0. 架构级变更检测
命中任一：1)改模块结构 2)动ADR 3)改公共契约 4)跨服务编排。命中→反问用户。

### 0.5 前端项目识别
含网站/UI/前端→判为前端。前端→路径建议(完整/中等/最短)。

### 1. 写 CHANGE.md

#### 1a. Problem Statement（强制）
Problem Statement **必须**描述"什么问题"而非"做什么任务"。
- 格式：**当前问题** → **量化代价** → **目标指标**
- 禁止以"实现/增加/验证/添加/构建"开头
- 例 ✅："当前 E2E 靠人工跑，每次发版 30min+，容易漏步骤。目标：CI 一键回归 < 60s"
- 例 ❌："验证 TaiyiForge nine-phase workflow end-to-end"

#### 1b. Scope（强制）
- **In scope**: ≥3 条，动词开头
- **Out of scope**: ≥3 条，明确写出本次不做
- **Risks**: ≥3 个风险 + 概率 + 缓解措施

#### 1c. Success Criteria（强制）
- ≥3 条 SC，每条附带量化检查方式
- 模板：`- [ ] **SC-NN**: <量化指标> — 验证: <命令/检查方式>`

#### 1d. Impact Map（强制）
- 列出所有受影响模块/服务/团队，≥3 行
- 格式：`| 模块/团队 | 影响 | 负责人 |`

#### 1e. Stakeholder Sign-off
- ≥3 个角色

#### 1f. Migration & Rollback（强制）
- 回滚方案必须精确到 git 命令
- 回滚时间必须写明具体数字

### 2. 禁止残留
- 模板 `[...]`（如 `[Minimal / Brutalist / ...]`）必须全部替换
- 禁止 `TBD` `TODO` `[填写理由]` `[N]`
- Problem Statement 禁止以"实现/增加/验证/添加/构建"开头
- 任何节内容为 0-1 行 → 不通过自检
- 不留空表格（所有表格至少 1 行有效数据）

### 3. 自检清单（写完后逐条核对）
- [ ] Problem Statement 描述"问题"而非"任务"
- [ ] In/Out Scope 各 ≥3 条
- [ ] Success Criteria ≥3 条且可量化
- [ ] Risk ≥3 条且有缓解措施
- [ ] Stakeholder ≥3 个角色
- [ ] 回滚方案精确到命令 + 分钟数
- [ ] 无 `[...]` `TODO` `TBD` 残留
- [ ] 无空表格

### 4. 完成
`npx taiyi complete <slug> change --approver "名"`（人工门）

## 禁止
- 跳过CHANGE直接写REQUIREMENT
- 在CHANGE写实现细节
- Success Criteria无法映射到测试
