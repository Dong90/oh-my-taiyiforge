# TaiyiForge 架构方案

> 版本：v0.38.0 · 2026-06-23

## 1. 产品定位

把六套 AI 工程标准（Harness/OpenSpec/GStack/Superpowers/OMO/Spec-Kit）编排成一条可执行、可审计的九阶段研发流水线。OpenCode/Claude/Codex/Cursor 四端共享同一套 Skill 和工件契约。

## 2. 核心架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        入口层 (Entry Points)                         │
│  taiyi CLI · taiyi-forge.sh · OpenCode plugin · MCP server · /slash │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────────────┐
│                      WorkflowEngine (状态机)                         │
│  initChange → completePhase → 阶段流转 → archive                    │
│  九阶段状态机 + 三门禁 + Token 预算 + 复杂度评估                       │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────────────┐
│           .taiyi/changes/<slug>/  (真源目录)                          │
│  CHANGE.md → REQUIREMENT.md → DESIGN.md → UI-DESIGN.md               │
│  → TASK.md → 代码(TDD) → TEST.md → REVIEW.md → CHANGELOG.md          │
│  state.json · phase.json × 8 · PHASE-CONTEXT.md · verify-report.json │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
┌────────────────────────────────┴────────────────────────────────────┐
│                     ChangeGraph (图引擎 v0.34+)                       │
│  95 节点 × 8 阶段 · 12 规则边目录 · SSOT 违例检测 · Agent SDK         │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. 代码布局

```
oh-my-taiyiforge/
├── src/
│   ├── cli/                    # CLI 入口 (taiyi.ts, install-cli.ts)
│   ├── commands/               # import-tool, init-wizard
│   ├── core/                   # ★ 引擎核心 (81 文件)
│   │   ├── workflow-engine.ts  #   状态机，completePhase
│   │   ├── types.ts            #   核心类型 (PhaseId, ChangeState)
│   │   ├── phase-context.ts    #   上下文生成 (图原生 + 旧正则)
│   │   ├── phase-write.ts      #   工件写入路由
│   │   ├── phase-registry.ts   #   阶段注册表
│   │   ├── phase-guide.ts      #   阶段引导输出
│   │   ├── state-sync.ts       #   磁盘 ↔ state.json 同步
│   │   ├── state-manager.ts    #   状态读写 (原子文件操作)
│   │   ├── e2e-fixtures.ts     #   E2E 测试夹具 (588 行)
│   │   ├── template-seed.ts    #   模板播种 (init 时)
│   │   ├── template-engine.ts  #   Handlebars 渲染引擎
│   │   ├── artifact-validator.ts # Zod 校验 + 质量门控
│   │   ├── reverse-sync.ts     #   Markdown → JSON 反向同步
│   │   ├── taiyi-archive.ts    #   归档模块
│   │   ├── profile.ts          #   7 种 profile 定义
│   │   ├── run-e2e-workflow.ts #   E2E 工作流执行器
│   │   ├── run-slash-flow-cli.ts # Slash 流程 CLI
│   │   ├── gates/              #   三门禁
│   │   │   ├── human-gate.ts       # 人类审批门
│   │   │   ├── quality-gate.ts     # 五维质量门
│   │   │   └── delivery-gate.ts    # 交付门
│   │   ├── change-graph/       #   ★ 图引擎 (v0.34+)
│   │   │   ├── types.ts            # GraphNode, Edge, EdgeRule, SSOTViolation
│   │   │   ├── loader.ts           # 8 阶段 JSON → 类型化节点
│   │   │   ├── edges.ts            # 12 EDGE_CATALOG 规则 + buildEdges + 违例检测
│   │   │   ├── query.ts            # getCrossCutting + validateConsistency + BFS
│   │   │   ├── render.ts           # renderAgentContext + toSnapshot/fromSnapshot
│   │   │   ├── index.ts            # ChangeGraph 类 (195 行)
│   │   │   └── agent-sdk.ts        # AgentContext (148 行)
│   │   └── executor.ts         #   LLM 辅助执行器
│   ├── schemas/                # Zod Schema (8 阶段)
│   │   ├── change.ts           #   1300+ 行字段定义
│   │   ├── requirement.ts
│   │   ├── design.ts
│   │   ├── ui-design.ts
│   │   ├── task.ts
│   │   ├── test.ts
│   │   ├── review.ts
│   │   └── integration.ts
│   ├── templates/              # Handlebars 模板 (9 阶段)
│   │   ├── change.hbs
│   │   ├── requirement.hbs
│   │   ├── design.hbs          #   含 mermaid 图 + SSOT 交叉引用
│   │   ├── ui-design.hbs       #   含 is_cli_only N/A 处理
│   │   ├── task.hbs            #   含 PITFALLS 引用 + 多 Slice 模式
│   │   ├── test.hbs
│   │   ├── review.hbs
│   │   ├── integration.hbs     #   含 System State Update
│   │   ├── PITFALLS.md         #   模板级坑位 (3 条目)
│   │   └── CONTEXT.md
│   ├── install/                # 多端安装同步 (24 文件)
│   ├── integrations/           # OpenSpec, MCP, Harness hooks
│   ├── mcp/                    # MCP server
│   └── plugin/                 # OpenCode plugin handlers
├── tests/
│   ├── core/
│   │   └── change-graph/       #   ChangeGraph 测试 (49 测试)
│   ├── templates/              #   模板渲染测试 (8 文件)
│   └── profile-cli-flow.test.ts # 7 profile CLI 流程测试
├── .pitfalls/                  # ★ PITFALLS 避坑系统 (v0.33+)
│   ├── GLOBAL.md               #   跨模块流程规则 (3 条目)
│   ├── scan.sh                 #   两层扫描脚本
│   └── rules/
│       ├── performance/        #   N+1, sync-io, large-module
│       └── safety/             #   empty-catch, hardcoded-secret, as-any, eval, missing-await
├── examples/                   # 示例工程
│   └── full-flow-demo/         #   九阶段完整演示
├── scripts/                    # 构建/安装/CI 脚本
├── docs/                       # 文档
│   ├── ARCHITECTURE.md
│   ├── taiyi/                  #   阶段定义, 命令参考, 控制面
│   └── c4/                     #   C4 架构文档
└── .github/workflows/          # CI (15 项检查)
    ├── ci.yml
    └── pr-title.yml
```

## 4. 九阶段工作流

```
change → requirement → design → ui-design → task → dev → test → review → integration → archive
 (👤)      (🤖)        (👤)       (🤖)     (🤖)    (🤖)   (🤖)   (👤)        (🤖)         (🤖)
```

| # | 阶段 | Skill | 门禁 | 产出 | 关键特性 |
|---|------|-------|:----:|------|---------|
| 1 | **change** | taiyi-change | 👤 人类 | CHANGE.md | one_liner 绑定 motivation，含 visual_tone/stakeholders/evidence |
| 2 | **requirement** | taiyi-requirement | 🤖 自动 | REQUIREMENT.md | one_liner 字段，NFR 安全/性能/可用性，Shadow Path 四路径分析 |
| 3 | **design** | taiyi-design | 👤 人类 | DESIGN.md | 4 模块 mermaid 图，决策对比表，Blast Radius，STRIDE 威胁建模 |
| 4 | **ui-design** | taiyi-ui-design | 🤖 自动 | UI-DESIGN.md | is_cli_only 自动跳过 UI 专用章节，Component Inventory/Tree/State/Motion/Token |
| 5 | **task** | taiyi-task | 🤖 自动 | TASK.md | Slice 分片，依赖图，Waves 分波，PITFALLS 引用，多 Slice 并行模式指引 |
| 6 | **dev** | taiyi-dev | 🤖 自动 | 代码 | 强制 TDD（先红后绿），.dev-complete 入参证据 |
| 7 | **test** | taiyi-test | 🤖 自动 | TEST.md | 三层策略(单元/集成/E2E)，覆盖率，回归计划，兼容矩阵 |
| 8 | **review** | taiyi-review | 👤 人类 | REVIEW.md | 5 维代码质量评分，跨 AI 评审，高危必改 |
| 9 | **integration** | taiyi-integration | 🤖 自动 | CHANGELOG.md | System State Update（活文档），回滚计划，监控告警，Post-Launch |

👤 = 需人类审批 · 🤖 = 自动门禁通过

## 5. 三门禁系统

### 5.1 人类审批 (Human Gate)
```typescript
// src/core/gates/human-gate-config.ts
requiresHumanGate("change")   // ✅ 需要 --approver
requiresHumanGate("design")   // ✅ 需要 --approver
requiresHumanGate("review")   // ✅ 需要 --approver
// 其余阶段自动通过
```

### 5.2 质量门禁 (Quality Gate)
```typescript
// src/core/gates/quality-gate.ts
type QualityScores = {
  completeness: boolean;       // 工件完整性
  consistency: boolean;        // 跨阶段一致性
  verifiability: boolean;      // 可验证性
  traceability: boolean;       // 可追溯性
  engineering_quality: boolean; // 工程质量
};
// 低复杂度 + 非人类门阶段 → relax 模式
// 中/高复杂度或 integration → strict 模式
```

### 5.3 交付门禁 (Delivery Gate)
```typescript
// src/core/gates/delivery-gate.ts
// integration 前检查：
// 1. git 有新 commit（相对 origin/main）
// 2. 工作区干净
// 3. CI 通过
```

## 6. 7 种 Profile（复杂度层级）

```typescript
type ChangeProfile = "full" | "api" | "ui" | "lite" | "spike" | "micro" | "nano";

// full:    9 阶段全流程
// api:     8 阶段（跳过 ui-design）
// ui:      9 阶段（等同 full）
// lite:    5 阶段（change → req → design → dev → integration）
// spike:   4 阶段（change → dev → test → integration）
// micro:   3 阶段（change → dev → integration）
// nano:    2 阶段（dev → integration，零文档）
```

## 7. 模板渲染管线

```
JSON Fixture → Handlebars Template → Markdown Artifact
                                 ↘ JSON companion file (Zod validated)
                                 ↘ SHA-256 hash snapshot
```

```typescript
// 渲染管道
TemplateEngine.render(template, vars) → Markdown
seedPhaseTemplate(changeDir, templatesDir, phaseId, vars) → 播种
renderE2ePhaseArtifact(phaseId, templatesDir) → E2E 渲染
seedArtifactFile(changeDir, templatesDir, artifact, vars) → 落盘
```

### 模板特性

| 特性 | 说明 |
|------|------|
| **字段绑定** | 所有字段从 fixture JSON 驱动，`{{#if field}}{{field}}{{else}}_N/A_{{/if}}` |
| **SSOT 交叉引用** | 7 处跨 5 份模板，指明 CHANGE.md 为风险/回滚真源 |
| **is_cli_only** | UI-DESIGN 模板自动将 5 个章节跳过（组件清单/树/响应式/动效/Token） |
| **System State Update** | CHANGELOG 尾段强制更新全局活文档（ARCHITECTURE/OpenAPI/DB schema/ERD） |
| **多 Slice 模式** | TASK 模板注明 ultrawork 模式可实现 per-slice TEST.md/REVIEW.md |

## 8. E2E 测试夹具系统

```typescript
// src/core/e2e-fixtures.ts (588 行)
E2E_JSON_ARTIFACTS = {
  change: { /* 200+ 行字段: title, motivation, scope, visual_tone, risks, stakeholders, evidence */ }
  requirement: { /* 100+ 行: features, scope_v1/v2/out, FR, NFR, AC, error_rescue_map, shadow_paths */ }
  design: { /* 50+ 行: techStack, modules, options, decision, blast_radius, rollout_steps, security_threats */ }
  "ui-design": { /* 5 行: scope, is_cli_only, states, accessibility */ }
  task: { /* 50+ 行: slices, waves, slice_risks, slice_rollbacks */ }
  test: { /* 30+ 行: test_plan, edge_cases, performance_tests, security_checks */ }
  review: { /* 30+ 行: findings, code_quality, test_coverage, security_audit, performance_audit */ }
  integration: { /* 30+ 行: changelog_entries, release_version/date, monitoring, rollback, post_launch */ }
};

E2E_ARTIFACTS = {
  change: { md: "硬编码 Markdown", json: E2E_JSON_ARTIFACTS.change }
  // ... 双重回退机制：模板渲染优先，无模板时用硬编码 md
};
```

## 9. ChangeGraph 图引擎（v0.34+）

### 9.1 核心类型
```typescript
GraphNode {
  id: string;           // "change-risk-0"
  phase: PhaseId;       // "change" | "requirement" | ...
  kind: NodeKind;       // "risk" | "nfr" | "threat" | "test_case" | "rollback" | ...
  label: string;        // 人类可读标签
  data: Record<string, unknown>;  // 原始 JSON
}

Edge { from: string; to: string; kind: EdgeKind; }

EdgeRule {
  fromPhases: PhaseId[];  fromKind: NodeKind;
  toPhases: PhaseId[];    toKind: NodeKind;
  edgeKind: EdgeKind;
  violationEnabled?: boolean;     // 是否检测 SSOT 违例
  matchStrategy?: "exact" | "substring" | "word-overlap-2" | "word-overlap-1";
}
```

### 9.2 12 条边规则 (EDGE_CATALOG)
```
risk(change)           → nfr(requirement)         derives_from   🔍
nfr(requirement)       → threat(design)            derives_from   🔍
threat(design)         → test_case(test)           tests          --
threat(design)         → test_case(review)         tests          --
acceptance_criterion   → test_case(test)           tests          --
design_decision(design)→ slice(task)               implements     🔍 exact
deployment_step(design)→ monitoring_metric(integ)  monitors       --
risk(task)             → risk(design)              derives_from   🔍 word-overlap-2
rollback(task)         → rollback(design)          rolls_back     🔍
rollback(change)       → rollback(design)          duplicates     🔍
rollback(design)       → rollback(integration)     rolls_back     🔍
test_case(test)        → test_case(review)         tests          --
```
🔍 = violationEnabled · -- = disabled

### 9.3 算法

**buildEdges — 位置配对**
```
1. 按规则过滤源/目标节点，按 ID 排序
2. zip-pair 配对 (minLen)：位置 i 的源连接位置 i 的目标
3. 边去重：同 from+to+kind 只保留一条
4. 特例：duplicates 边仍用笛卡尔积（全连接以检测所有差异）
```

**detectSSOTViolations — 规则驱动违例检测**
```
1. 过滤 violationEnabled 的规则
2. 位置配对比较 (minLen)
3. matchStrategy 控制判定：
   - exact: 严格字符串相等
   - substring: 允许子串包含
   - word-overlap-2: ≥2 个共同词则跳过
   - word-overlap-1: ≥1 个共同词则跳过
4. 输出 SSOTViolation[]，含 severity（rollback=high, risk=medium, design_decision=low）
```

### 9.4 性能指标
```
数据集: 95 节点 / 8 阶段
边: 69 条（位置配对优化后，原笛卡尔积 212 条）
违例: 7 条（4 策略 + SKIP_KINDS 过滤后，原全量 638 条）
```

## 10. Agent SDK

```typescript
// src/core/change-graph/agent-sdk.ts
class AgentContext {
  static fromChangeDir(changeDir, slug): AgentContext;
  static fromFixtures(fixtures, slug): AgentContext;

  getFullContext(): string;           // 替代 PHASE-CONTEXT.md
  getSecurityAudit(): string;         // risk→nfr→threat→test 完整链路
  getRollbackPlan(): string;          // 统一回滚视图
  getSSOTReport(): string;            // 跨阶段不一致报告
  getPhaseSummary(phaseId): string;   // 单阶段摘要
  getPhaseChecklist(phaseId): string; // 阶段检查清单

  writePhaseContext(): void;  // 落盘 PHASE-CONTEXT.md
  writeReport(name, content): void;

  refresh(): void;  // 重新加载所有 phase JSON
  getGraph(): ChangeGraph;
}
```

## 11. PITFALLS 避坑系统（v0.33+）

### 11.1 B 方案：ast-grep 自动模式扫描
```
.pitfalls/rules/
├── performance/
│   ├── n-plus-one.yml        # 循环内异步请求
│   ├── sync-io-block.yml     # async 内同步 I/O
│   └── large-module.yml      # 250 LOC 阈值
└── safety/
    ├── empty-catch.yml       # 空 catch 块
    ├── missing-await.yml     # 缺失 await
    ├── hardcoded-secret.yml  # 硬编码密钥
    ├── as-any.yml            # as any 断言
    └── unsafe-eval.yml       # eval() / new Function()
```

### 11.2 C 方案：per-module 分拆
```
src/core/PITFALLS.md       (4 条目: state-sync, append-context, handlebars-if, glob-cache)
src/cli/PITFALLS.md        (2 条目: commander-async, spawnSync-timeout)
src/templates/PITFALLS.md  (3 条目: each-@key, fallback-dup, full-test-regression)
src/schemas/PITFALLS.md    (2 条目: schema-fixture-drift, optional-vs-nullable)
src/install/PITFALLS.md    (2 条目: missing-cli, tilde-expansion)
src/integrations/PITFALLS.md (2 条目: openspec-dir, MCP-env)
.pitfalls/GLOBAL.md        (3 条目: 周五不发版, npm-audit 必过, CI 全绿才合)
```

### 11.3 扫描器
```bash
.pitfalls/scan.sh              # 全量扫描
.pitfalls/scan.sh --module src/core  # 指定模块
.pitfalls/scan.sh --ci              # CI 模式 (exit 1 on failure)
```

## 12. Zod Schema 校验

```typescript
// src/schemas/ — 8 阶段，每个 ~100-300 行
ZOD_SCHEMAS = {
  change: ChangeSchema,        // title, motivation, scope, risks[], stakeholders[], evidence
  requirement: RequirementSchema, // features[], scope_v1[], FR[], NFR, acceptance_criteria[], shadow_paths[]
  design: DesignSchema,        // techStack, modules[], options[], decision, blast_radius[], security_threats[]
  "ui-design": UiDesignSchema, // scope, states[], accessibility[], links[]
  task: TaskSchema,            // slices[], waves[], slice_risks[], slice_rollbacks[]
  test: TestSchema,            // test_plan[], edge_cases[], performance_tests[], security_checks[]
  review: ReviewSchema,        // findings[], code_quality[], test_coverage[], security_audit[]
  integration: IntegrationSchema // changelog_entries[], release_version/date, monitoring[], rollback
};

// 校验流程
validateArtifactFile(path, phaseId) → {
  // 1. Zod schema.parse(phase.json)
  // 2. Seed template 检测
  // 3. 占位符残留检测
  // 4. Evidence 强校验 (change/requirement/test)
  // 5. contentQualityGate (占位符/空表/任务动词)
}
```

## 13. Token 预算

```typescript
// src/core/token-invoke.ts
// 全局上限: 500,000 tokens
// 每阶段记录 → .token-usage.json
// /taiyi:token status   → 查看
// /taiyi:token record N → 记录
// /taiyi:token compress → 产生 CONTEXT-COMPACT.md
```

| 阶段 | 典型消耗 (Agent) | 图优化后 | 节省 |
|------|:---:|:---:|:---:|
| change | ~15K | ~15K | - |
| requirement | ~20K | ~15K | -25% |
| design | ~25K | ~18K | -28% |
| ui-design | ~15K | ~10K | -33% |
| task | ~18K | ~12K | -33% |
| dev | ~40K | ~40K | - |
| test | ~35K | ~20K | -43% |
| review | ~25K | ~15K | -40% |
| integration | ~25K | ~15K | -40% |
| **全程** | **~218K** | **~160K** | **-27%** |

## 14. 状态机

```
state.json {
  slug: string;
  currentPhase: PhaseId;           // 当前阶段
  completedPhases: PhaseId[];       // 已完成阶段列表
  workflowStatus: "active" | "completed" | "aborted";
  profile: ChangeProfile;
  skippedPhases: PhaseId[];        // 跳过阶段 (profile 决定)
  strictDev: boolean;               // 严格 TDD 模式
  autoHarness: boolean;             // 全自动编排
  complexity: ComplexityAssessment; // 复杂度评估
  auxiliaryCompleted: string[];     // 辅助 Skill 完成记录
  createdAt: string;
  updatedAt: string;
}
```

状态转换：
```
active → (completePhase × 9) → completed
active → (abortChange) → aborted
completed → (archive) → archived
```

## 15. CI/CD

```yaml
# .github/workflows/ci.yml - 15 项检查
jobs:
  typecheck:     tsc --noEmit
  test:          vitest × 4 matrix (node 20/22 × ubuntu/macos)
  dogfood:       npm run dogfood (E2E 九阶段验证)
  coverage:      测试覆盖率报告
  fmt:           格式检查
  conventional-commits: PR 标题规范
  platform-smoke: 四端安装冒烟 (opencode/claude/codex/cursor)
  pack-smoke:    npm pack + 全新安装 + CLI 冒烟
  publish-dry:   npm publish --dry-run
  ci-verify:     taiyi ci verify (工件门禁)
  postinstall:   安装后冒烟
  doc-sync:      commands.yaml ↔ 文档同步
```

## 16. 扩展点

| 扩展点 | 方式 |
|--------|------|
| **新阶段** | `registerCustomPhase()` + `PhaseId: string & {}` |
| **新 Profile** | `src/core/profile.ts` → `skippedPhasesForProfile()` |
| **新 Gate** | `src/core/gates/` → add gate + wire in `completePhase()` |
| **新 NodeKind / EdgeRule** | `EDGE_CATALOG.push({...})` + `extractNodesFromPhase()` 新增 switch case |
| **新 PITFALL** | 对应模块的 `src/*/PITFALLS.md` 追加 P-XXX 条目 |
| **新 ast-grep 规则** | `.pitfalls/rules/<category>/<rule>.yml` |
| **新 Agent SDK 方法** | `src/core/change-graph/agent-sdk.ts` |
| **新模板字段** | fixture JSON → `.hbs` 绑定 → Zod schema 同步更新 |

## 17. 关键指标

| 指标 | 数值 |
|------|------|
| 测试文件 | 130 |
| 测试数量 | 829 (1 skip) |
| 核心 TypeScript 文件 | 81 |
| Zod Schema 文件 | 8 |
| Handlebars 模板 | 9 |
| EDGE_CATALOG 规则 | 12 |
| PITFALLS 模块 | 6 |
| ast-grep 规则 | 8 |
| Profile 数量 | 7 |
| 支持 AI 终端 | 4 (OpenCode/Claude/Codex/Cursor) |
| 总 TypeScript 行数 | ~12,000 |
| 总 Markdown 文档 | ~2,500 |
| CI 检查项 | 15 |
