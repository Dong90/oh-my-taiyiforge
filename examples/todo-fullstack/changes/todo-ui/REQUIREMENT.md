---
phase: requirement
skill: taiyi-requirement
gate: auto
produces: REQUIREMENT.md
upstream: [change]
downstream: [design, ui-design]
---
<!-- phase:requirement skill:taiyi-requirement gate:auto est:20min produces:REQUIREMENT.md upstream:[change] downstream:[design,ui-design] cplx:[ALL]5steps +[M+]4 +[H]1 -->
# REQUIREMENT: E2E Demo

> **一句话**: 九阶段 E2E 自动化回归：一键验证全流程工件生成、门控通过与 CI 集成

---

> ⛔ **Out of Scope — 本变更明确不覆盖以下事项**
> <!-- 放置在最顶部，让读者第一眼知道什么不做。与 Step 2 的 scope_out 内容一致无需重复详述，此处为硬性提醒 -->
> - Production deployment changes
> - Multi-tenant support
> - UI/frontend components
>
> 📌 *完整范围切分见下方 §Step 2 Scope Partitioning*

---

## Step 1: User Stories
> **[ALL]** Goal: 从用户视角说清需求 | Inputs: CHANGE.md §1, §2
<!-- Action: As a [角色] I want [功能] so that [价值]. 覆盖所有角色 -->

* As a developer, I want the E2E workflow to validate all nine phases so that I trust every release
* As a CI maintainer, I want automated gate verification so that human errors are caught early
* As a contributor, I want example artifacts I can inspect so that I understand the workflow without reading source code

<!-- Validate: 所有用户角色都覆盖了？ -->

## Step 2: Scope Partitioning
> **[ALL]** Goal: 分版本切范围，防 TASK 阶段误判 | Inputs: CHANGE.md §2
<!-- Action: v1=本次必做, v2=下次, out=永不. 至少 v2+out 各 ≥1 条 -->

### v1（本次必做）
- Nine-phase workflow runs to completion
- All gates pass including quality and human
- example/ 内可复现的 inplace 验证脚本
- verify-report.json 含 ok/errors/stepCount

### v2（下次）
- External test runner integration (non-Vitest)
- Browser E2E smoke tests via Playwright
- CI matrix across 4 platforms (OpenCode/Claude/Codex/Cursor)

### out（永不）
- Production deployment changes
- Multi-tenant support
- UI/frontend components

<!-- Validate: v2 和 out 各 ≥ 1 条？v1 不包含 out 项？ -->

## Step 3: Functional Requirements
> **[ALL]** Goal: 拆成可测试的功能点 | Inputs: Step1
<!-- Action: FR-XX编号，分模块。涉及UI标注(UI)→触发Phase4 -->

### Workflow Engine
- **FR-01**: E2E test validates all nine phases complete from init to archive
- **FR-02**: Gates pass including quality and human approvals
- **FR-03**: Phase artifacts are generated with correct content (markdown + JSON)
### Example Scripts
- **FR-04**: run-inplace-verify.mjs writes .taiyi/archive/ with 11/11 expected files
- **FR-05**: verify-report.json contains generatedAt/ok/errors/stepCount

<!-- Validate: 每个FR可独立测试？编号连续？ -->

## Step 4: Acceptance Criteria
> **[ALL]** Goal: 每个FR都有客观验收标准 | Inputs: Step3
<!-- Action: Given/When/Then，AC-XX对应FR-XX。verify=可执行验证命令 -->

- [x] **AC-01**: State shows integration completed
  - **验证**: `taiyi-forge.sh status --json --compact | grep completed`
- [x] **AC-02**: Artifact count equals expected 11 files
  - **验证**: `ls .taiyi/changes/*/CHANGE.md .taiyi/changes/*/REQUIREMENT.md .taiyi/changes/*/state.json | wc -l`
- [x] **AC-03**: verify-report.json ok:true with zero errors
  - **验证**: `cat verify-report.json | grep -q '"ok": true'`

<!-- Validate: 每个AC可独立验收？Given/When/Then完整？验证命令可执行？ -->

## Step 5: Non-Functional Requirements
> **[ALL]** Goal: 性能/安全/可用性有硬指标 | Inputs: Step2
<!-- Action: NFR-XX编号，每个带数值 -->

### 性能
- **NFR-P01**: 全流程 E2E < 60s
- **NFR-P02**: 单阶段 artifact 写入 < 500ms

### 安全
- **NFR-S01**: 无硬编码密钥/令牌
- **NFR-S02**: state.json 不包含敏感路径信息

### 可用性
- **NFR-A01**: CI 可用性 99%+

<!-- Validate: 每个指标有具体数字？ -->

> 📎 **SSOT 规则**: NFR-S* 安全要求应基于 [CHANGE.md §Risks](CHANGE.md) 做非功能性拆解，不独立重评估。每条 NFR-S 应与 CHANGE 的 risks[] 可追溯。

## Step 6: Error & Rescue Map
> **[MEDIUM+]** Goal: 每个错误都有名字和恢复路径 | Inputs: Step2+3
<!-- Action: 触发条件→捕获位置→用户看到→恢复路径 -->

| 错误类型 | 触发 | 捕获 | 用户看到 | 恢复 |
|---------|------|------|---------|------|
| CLI 参数错误 | 无效参数 | commander | 错误提示+用法 | 重新输入 |
| state.json 格式错误 | 手动修改 state | Zod schema 校验 | 校验失败提示 | 回退 state 备份 |
| 模板丢失 | 散装项目缺少 .hbs | 回退到硬编码 md | 生成完整但无模板增强 | 安装模板目录 |

<!-- Validate: 所有可能的错误都有名字？恢复路径可执行？ -->

## Step 7: Shadow Path Analysis
> **[MEDIUM+]** Goal: 每条数据流覆盖四路径 | Inputs: Step5
<!-- Action: Happy/Nil/Empty/UpstreamErr 逐条标注 -->

### E2E Workflow
| 路径 | 输入 | 预期 |
|------|------|------|
| Happy | 完整九阶段输入 | 全部通过+门禁绿 |
| Nil | 空输入 | CLI 提示用法 |
| Empty | 空 workspace | 初始化 change |
| UpstreamErr | 上游 CI 取消 | 跳过回归标记 |
### Artifact Verification
| 路径 | 输入 | 预期 |
|------|------|------|
| Happy | 生成 11/11 文件 | verify ok |
| Nil | 空 change 目录 | assertExpectedArtifacts 报 missing |
| Empty | 部分文件缺失 | assert 列出缺失文件清单 |
| UpstreamErr | profile 跳过阶段 | 缩小 expectedArtifacts |

<!-- Validate: 核心流程都覆盖了四路径？ -->

## Step 8: Non-Happy-Path Matrix
> **[MEDIUM+]** Goal: 边界和异常不遗漏 | Inputs: Step5+6
<!-- Action: 空值/超时/并发/权限/非法输入全覆盖 -->

| 场景 | 预期行为 |
|------|---------|
| 空输入 | 显示用法提示 |
| 无效 slug | 报错退出 |
| 跳过阶段 | 缩小验证范围 |
| 不完整工件 | assert 失败并提示缺失文件 |

<!-- Validate: 典型边界(空/超/并发/权限)全覆盖？ -->

## Step 9: Dependencies
> **[MEDIUM+]** Goal: 外部依赖不阻塞 | Inputs: CHANGE.md §4
<!-- Action: 技术约束/第三方/跨团队+状态+风险 -->

| 依赖 | 类型 | 状态 | 风险 |
|------|------|------|------|
| vitest | 测试框架 | 已安装 | 无 |
| handlebars | 模板引擎 | 已安装 | 无 |
| commander | CLI 框架 | 已安装 | 无 |
| zod | 校验库 | 已安装 | 无 |

<!-- Validate: 第三方SLA确认？跨团队排期对齐？ -->

## Step 10: Security & Compliance
> **[HIGH]** Goal: 安全不出事 | Inputs: Step4+5
<!-- Action: OWASP Top10 + GDPR/PIPL. user/auth/payment/PII场景必填 -->

- [ ] npm audit 无 critical/high
- [ ] 无硬编码密钥
- [ ] 测试数据无 PII

<!-- Validate: threat modeling过了？PII合规？ -->

---
## Quality Gate
<!-- Evidence-first: 每个需求可追溯到CHANGE.md的SC，Superpowers: 需求逐条对账 -->

- [ ] S1 用户角色全覆盖
- [ ] S2 版本切分 v1/v2/out 各≥1条
- [ ] S3 每个FR可独立测试
- [ ] S4 AC用Given/When/Then + 验证命令
- [ ] S5 非功能需求有数值
- [ ] [M+] S6 Error/Rescue全覆盖 | gstack PD#2
- [ ] [M+] S7 核心流程四路径 | gstack PD#3
- [ ] [M+] S8 典型边界全覆盖
- [ ] [M+] S9 依赖关系已确认
- [ ] [H]  S10 安全合规已覆盖
- [ ] 无[NEEDS CLARIFICATION]残留
