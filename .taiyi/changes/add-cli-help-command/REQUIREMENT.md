---
phase: requirement
skill: taiyi-requirement
gate: auto
produces: REQUIREMENT.md
upstream: [change]
downstream: [design, ui-design]
---
<!-- phase:requirement skill:taiyi-requirement gate:auto est:20min produces:REQUIREMENT.md upstream:[change] downstream:[design,ui-design] cplx:[ALL]5steps +[M+]4 +[H]1 -->
# REQUIREMENT: CLI --help command requirement

> **一句话**: CLI --help command requirement

---

> ⛔ **Out of Scope — 本变更明确不覆盖以下事项**
> <!-- 放置在最顶部，让读者第一眼知道什么不做。与 Step 2 的 scope_out 内容一致无需重复详述，此处为硬性提醒 -->
> - man page
> - web 文档
>
> 📌 *完整范围切分见下方 §Step 2 Scope Partitioning*

---

## Step 1: User Stories
> **[ALL]** Goal: 从用户视角说清需求 | Inputs: CHANGE.md §1, §2
<!-- Action: As a [角色] I want [功能] so that [价值]. 覆盖所有角色 -->

- **As a** 新用户, **I want** 敲 help 看到所有可用命令, **so that** 我能快速上手
- **As a** 开发者, **I want** 每个命令带一句话说明, **so that** 我知道命令的用途

<!-- Validate: 所有用户角色都覆盖了？ -->

## Step 2: Scope Partitioning
> **[ALL]** Goal: 分版本切范围，防 TASK 阶段误判 | Inputs: CHANGE.md §2
<!-- Action: v1=本次必做, v2=下次, out=永不. 至少 v2+out 各 ≥1 条 -->

### v1（本次必做）
- help 主命令
- 每个子命令一句话说明
- 输出格式化

### v2（下次）
- help --search
- 交互式教程

### out（永不）
- man page
- web 文档

<!-- Validate: v2 和 out 各 ≥ 1 条？v1 不包含 out 项？ -->

## Step 3: Functional Requirements
> **[ALL]** Goal: 拆成可测试的功能点 | Inputs: Step1
<!-- Action: FR-XX编号，分模块。涉及UI标注(UI)→触发Phase4 -->

### packages/cli/src/commands/help.ts
- **FR-01**: 列出所有已注册 commander 命令
- **FR-02**: 格式化输出含命令名和描述

<!-- Validate: 每个FR可独立测试？编号连续？ -->

## Step 4: Acceptance Criteria
> **[ALL]** Goal: 每个FR都有客观验收标准 | Inputs: Step3
<!-- Action: Given/When/Then，AC-XX对应FR-XX。verify=可执行验证命令 -->

- [ ] **AC-01**: Given 无参数, When 执行 help, Then 输出命令清单
  - **验证**: `npm start help | grep -c command`
- [ ] **AC-02**: Given 任何命令, When 执行 help, Then 显示该命令详细帮助
  - **验证**: `npm start help build | grep Usage`

<!-- Validate: 每个AC可独立验收？Given/When/Then完整？验证命令可执行？ -->

## Step 5: Non-Functional Requirements
> **[ALL]** Goal: 性能/安全/可用性有硬指标 | Inputs: Step2
<!-- Action: NFR-XX编号，每个带数值 -->

### 性能
- **NFR-P01**: help 命令响应 < 50ms

### 安全
- **NFR-S01**: 无新增攻击面

### 可用性
- **NFR-A01**: CI 兼容

<!-- Validate: 每个指标有具体数字？ -->

> 📎 **SSOT 规则**: NFR-S* 安全要求应基于 [CHANGE.md §Risks](CHANGE.md) 做非功能性拆解，不独立重评估。每条 NFR-S 应与 CHANGE 的 risks[] 可追溯。

## Step 6: Error & Rescue Map
> **[MEDIUM+]** Goal: 每个错误都有名字和恢复路径 | Inputs: Step2+3
<!-- Action: 触发条件→捕获位置→用户看到→恢复路径 -->

| 错误类型 | 触发 | 捕获 | 用户看到 | 恢复 |
|---------|------|------|---------|------|
| 命令名不存在 | 用户输入不存在的命令 | commander.js 内置 | command not found 错误信息 | 显示可用命令列表 |

<!-- Validate: 所有可能的错误都有名字？恢复路径可执行？ -->

## Step 7: Shadow Path Analysis
> **[MEDIUM+]** Goal: 每条数据流覆盖四路径 | Inputs: Step5
<!-- Action: Happy/Nil/Empty/UpstreamErr 逐条标注 -->

### help 执行
| 路径 | 输入 | 预期 |
|------|------|------|
| Happy | 无参数 | 命令清单输出 |
| Nil | 无命令注册 | 空列表 |
| Empty | 空 stdin | 正常输出 |
| UpstreamErr | commander 未初始化 | 报错退出 |

<!-- Validate: 核心流程都覆盖了四路径？ -->

## Step 8: Non-Happy-Path Matrix
> **[MEDIUM+]** Goal: 边界和异常不遗漏 | Inputs: Step5+6
<!-- Action: 空值/超时/并发/权限/非法输入全覆盖 -->

| 场景 | 预期行为 |
|------|---------|
| stdout 被管道截断 | 输出到 stderr 的 error 仍然正常工作 |
| 超宽终端 | 自动换行不截断 |

<!-- Validate: 典型边界(空/超/并发/权限)全覆盖？ -->

## Step 9: Dependencies
> **[MEDIUM+]** Goal: 外部依赖不阻塞 | Inputs: CHANGE.md §4
<!-- Action: 技术约束/第三方/跨团队+状态+风险 -->

| 依赖 | 类型 | 状态 | 风险 |
|------|------|------|------|
| commander.js | 已安装 | active | none |

<!-- Validate: 第三方SLA确认？跨团队排期对齐？ -->

## Step 10: Security & Compliance
> **[HIGH]** Goal: 安全不出事 | Inputs: Step4+5
<!-- Action: OWASP Top10 + GDPR/PIPL. user/auth/payment/PII场景必填 -->

- [ ] npm audit 无 critical/high
- [ ] 无硬编码密钥/令牌
- [ ] PII/GDPR 合规检查（若涉及用户数据）

<!-- Validate: threat modeling过了？PII合规？ -->

---
## Quality Gate
<!-- Evidence-first: 每个需求可追溯到CHANGE.md的SC，ECC 替代 Superpowers 需求逐条对账 -->

- [ ] S1 用户角色全覆盖
- [ ] S2 版本切分 v1/v2/out 各≥1条
- [ ] S3 每个FR可独立测试
- [ ] S4 AC用Given/When/Then + 验证命令
- [ ] S5 非功能需求有数值
- [ ] [M+] S6 Error/Rescue全覆盖 | PD#2
- [ ] [M+] S7 核心流程四路径 | PD#3
- [ ] [M+] S8 典型边界全覆盖
- [ ] [M+] S9 依赖关系已确认
- [ ] [H]  S10 安全合规已覆盖
- [ ] 无[NEEDS CLARIFICATION]残留
