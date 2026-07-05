---
phase: requirement
skill: taiyi-requirement
gate: auto
produces: REQUIREMENT.md
upstream: [change]
downstream: [design, ui-design]
---
<!-- phase:requirement skill:taiyi-requirement gate:auto est:20min produces:REQUIREMENT.md upstream:[change] downstream:[design,ui-design] cplx:[ALL]5steps +[M+]4 +[H]1 -->
# REQUIREMENT: 巡检九阶段文档质量：对已完成 change 的全工件+代码评分

> **一句话**: 巡检 add-cli-help-command 和 ecc-hybrid-harness 的九阶段工件完整性与代码质量并输出评分报告

---

> ⛔ **Out of Scope — 本变更明确不覆盖以下事项**
> <!-- 放置在最顶部，让读者第一眼知道什么不做。与 Step 2 的 scope_out 内容一致无需重复详述，此处为硬性提醒 -->
> - 修改已有业务代码
> - 新功能开发
> - 运行 Playwright/E2E 测试
>
> 📌 *完整范围切分见下方 §Step 2 Scope Partitioning*

---

## User Stories
> **[ALL]** Goal: 从用户视角说清需求 | Inputs: CHANGE.md §1, §2
<!-- Action: As a [角色] I want [功能] so that [价值]. 覆盖所有角色 -->

| US-ID | As a | I want | So that | Priority |
|-------|------|--------|---------|----------|
| US-01 | 项目维护者 | 对已完成的 TaiyiForge 变更进行全面质量巡检 | 了解工作流产出的质量水平和可改进点 | P0 |
| US-02 | 项目维护者 | 交叉对比两个已完成 change 的九阶段工件 | 发现工件模板填写中的共性问题 | P1 |

<!-- Validate: 所有用户角色都覆盖了？ -->

## Step 2: Scope Partitioning
> **[ALL]** Goal: 分版本切范围，防 TASK 阶段误判 | Inputs: CHANGE.md §2
<!-- Action: v1=本次必做, v2=下次, out=永不. 至少 v2+out 各 ≥1 条 -->

### v1（本次必做）
- 读取 add-cli-help-command 全部九阶段工件并逐项评分
- 读取 ecc-hybrid-harness 全部九阶段工件并逐项评分
- 输出交叉对比和共性问题汇总
- 给出至少 3 条改进建议

### v2（下次）
- 扩展到所有已完成 change 的批量巡检
- 生成可视化评分面板

### out（永不）
- 修改已有业务代码
- 新功能开发
- 运行 Playwright/E2E 测试

<!-- Validate: v2 和 out 各 ≥ 1 条？v1 不包含 out 项？ -->

## Step 3: Functional Requirements
> **[ALL]** Goal: 拆成可测试的功能点 | Inputs: Step1
<!-- Action: FR-XX编号，分模块。涉及UI标注(UI)→触发Phase4 -->

### 巡检引擎
- **FR-01**: 读取 .taiyi/changes/ 下目标 change 的全部九阶段工件
- **FR-02**: 按九个阶段维度逐项评分并计算加权总分
- **FR-03**: 输出结构化评分报告含共性问题汇总和改进建议

<!-- Validate: 每个FR可独立测试？编号连续？ -->

## Acceptance Criteria
> **[ALL]** Goal: 每个FR都有客观验收标准 | Inputs: Step3
<!-- Action: Given/When/Then，AC-XX对应FR-XX。verify=可执行验证命令 -->

| AC-ID | Given | When | Then | Verify |
|-------|-------|------|------|--------|
| AC-01 | 巡检脚本已完成配置 | 巡检两个已完成 change 的九阶段工件 | 输出包含各阶段评分的巡检报告 | 检查巡检报告中各阶段评分维度完整性 |
| AC-02 | 巡检报告已完成生成 | 查看报告的具体内容 | 每个阶段有 0-10 分且代码质量有独立评分 | 检查报告中评分字段和问题列表完整性 |
| AC-03 | 巡检报告已完成生成 | 检查两个 change 的横向对比 | 有共性问题汇总和至少 3 条改进建议 | 检查对比章节和共性问题数量 |

- [ ] **AC-01**
  Given 巡检脚本已完成配置
  When 巡检两个已完成 change 的九阶段工件
  Then 输出包含各阶段评分的巡检报告
  Verify: 检查巡检报告中各阶段评分维度完整性
- [ ] **AC-02**
  Given 巡检报告已完成生成
  When 查看报告的具体内容
  Then 每个阶段有 0-10 分且代码质量有独立评分
  Verify: 检查报告中评分字段和问题列表完整性
- [ ] **AC-03**
  Given 巡检报告已完成生成
  When 检查两个 change 的横向对比
  Then 有共性问题汇总和至少 3 条改进建议
  Verify: 检查对比章节和共性问题数量

<!-- Validate: 每个AC可独立验收？Given/When/Then完整？验证命令可执行？ -->

## Step 5: Non-Functional Requirements
> **[ALL]** Goal: 性能/安全/可用性有硬指标 | Inputs: Step2
<!-- Action: NFR-XX编号，每个带数值 -->

### 性能
- **NFR-P01**: 巡检两个 change 总耗时 < 120 秒

### 安全
- **NFR-S01**: 巡检过程零文件写入，写入操作数 = 0

### 可用性
- **NFR-A01**: 无网络依赖，network requests ≤ 0 次

<!-- Validate: 每个指标有具体数字？ -->

> 📎 **SSOT 规则**: NFR-S* 安全要求应基于 [CHANGE.md §Risks](CHANGE.md) 做非功能性拆解，不独立重评估。每条 NFR-S 应与 CHANGE 的 risks[] 可追溯。

## Step 6: Error & Rescue Map
> **[MEDIUM+]** Goal: 每个错误都有名字和恢复路径 | Inputs: Step2+3
<!-- Action: 触发条件→捕获位置→用户看到→恢复路径 -->

| 错误类型 | 触发 | 捕获 | 用户看到 | 恢复 |
|---------|------|------|---------|------|
| 目标 change 目录不存在 | 指定了不存在的 change slug | 巡检脚本前置检查 | 目标 change 不存在 | 输入正确 slug 重试 |

<!-- Validate: 所有可能的错误都有名字？恢复路径可执行？ -->

## Step 7: Shadow Path Analysis
> **[MEDIUM+]** Goal: 每条数据流覆盖四路径 | Inputs: Step5
<!-- Action: Happy/Nil/Empty/UpstreamErr 逐条标注 -->

### 巡检执行流程
| 路径 | 输入 | 预期 |
|------|------|------|
| Happy | 有效的 change slug | 巡检完成并输出评分报告 |
| Nil | slug 为空或 undefined | 报错提示需要提供 slug |
| Empty | slug 对应目录为空 | 标记为无工件并跳过 |
| UpstreamErr | 文件系统不可读 | 报告读取失败并跳过该文件 |

<!-- Validate: 核心流程都覆盖了四路径？ -->

## Step 8: Non-Happy-Path Matrix
> **[MEDIUM+]** Goal: 边界和异常不遗漏 | Inputs: Step5+6
<!-- Action: 空值/超时/并发/权限/非法输入全覆盖 -->

| 场景 | 预期行为 |
|------|---------|
| 目标 change 工件不完整 | 标记对应阶段为 0 分并列出缺失工件 |
| 权限不足无法读取文件 | 报告文件读取失败并跳过该文件 |

<!-- Validate: 典型边界(空/超/并发/权限)全覆盖？ -->

## Step 9: Dependencies
> **[MEDIUM+]** Goal: 外部依赖不阻塞 | Inputs: CHANGE.md §4
<!-- Action: 技术约束/第三方/跨团队+状态+风险 -->

| 依赖 | 类型 | 状态 | 风险 |
|------|------|------|------|
| Node fs 模块 | 内置 | active | none |

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
