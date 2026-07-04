import type { PhaseId } from "./types.js";
import { listPhases } from "./phase-registry.js";

/** Zod-valid minimal JSON payloads (mirror ChangeSchema etc.) for E2E / dogfood seed. */
const E2E_JSON_ARTIFACTS: Record<Exclude<PhaseId, "dev">, object> = {
  change: {
    title: "E2E Demo",
    motivation: "Validate TaiyiForge nine-phase workflow end-to-end in CI and dogfood runs.",
    scope: {
      includes: [
        "workflow engine smoke test across all 9 phases",
        "artifact generation and validation for each phase",
        "gate verification (quality + human approval)",
        "verify-report generation and CI integration",
      ],
      excludes: ["production feature changes", "browser E2E testing", "multi-tenant support"],
    },
    visual_tone: "简洁·技术风 - Minimalist dev-tool aesthetic",
    visual_reason: "CLI 工具适合等宽字体+高对比度配色，兼顾终端可读性和 CI 日志友好",
    visual_references: "Vitest CLI · ESLint · Biome",
    visual_excluded: "彩色图标、复杂仪表盘、非等宽字体",
    success_criteria: [
      { id: "SC-01", description: "All nine phases complete with gates passing", is_checked: true },
      { id: "SC-02", description: "Fresh .taiyi/changes/ artifact dir contains 11/11 files", is_checked: true },
      { id: "SC-03", description: "verify-report.json ok:true with zero errors", is_checked: true },
    ],
    do_nothing_cost: "缺乏自动化回归，每次发版需人工走九阶段，耗时 30min+，容易漏步骤",
    target_state: "一键 E2E 回归 < 60s，CI 自动通过全部九阶段门控",
    premise_redefine: "不是'写个测试'，而是'让 CI 能自动验证整个研发流水线'",
    premise_cost: "缺乏自动化回归时：每次 30min 手工验证 × 每周 2 次发版 = 1h/周浪费",
    premise_existing: "Vitest 已有 126 文件，仅需加 E2E 夹具即可复用",
    premise_scrap: "不做 E2E，改用 Playwright 全真机测试 → 成本高 10x，CI 慢 3x，不符合当前阶段需求",
    migration_steps: "npm install (无额外步骤) — 测试代码纯增量，无数据迁移",
    rollback_trigger: "E2E 测试持续失败 (>2 次重试)",
    rollback_ops: "git revert <commit>",
    rollback_time: "5min",
    impact_map: [
      { module: "CI/CD pipeline", impact: "新测试用例加入回归矩阵", owner: "CI/CD" },
      { module: "Workflow Engine", impact: "覆盖九个阶段的完整E2E路径", owner: "Engine Team" },
      { module: "examples/full-flow-demo", impact: "作为可复现验证入口", owner: "Docs Team" },
    ],
    risks: [
      { risk: "E2E 测试假阳性", probability: "中", impact: "误拦发布", mitigation: "CI 重试 + 人工确认" },
      { risk: "测试超时", probability: "低", impact: "CI 队列堵塞", mitigation: "各阶段独立超时预算" },
      { risk: "模板与实际工件漂移", probability: "低", impact: "E2E 失效", mitigation: "共享 E2E_ARTIFACTS 夹具保证同源" },
    ],
    innovation_tokens: [
      { decision: "Vitest 全量回归", is_token: false, reason: "已有技术栈，无新引入" },
      { decision: "Handlebars 模板引擎", is_token: false, reason: "团队已在使用，非新技术" },
    ],
    stakeholders: [
      { role: "Engine Team", name: "CI/CD", needs: "自动化回归通过即可合并" },
      { role: "QA", name: "N/A", needs: "E2E 测试覆盖 smog check" },
      { role: "Maintainer", name: "OpenSource", needs: "示例工程可复现，降低贡献门槛" },
    ],
    evidence: {
      command: "taiyi-forge.sh status --json --compact",
      exitCode: 0,
      capturedAt: "2026-06-22T12:00:00Z",
    },
  },
  requirement: {
    title: "E2E Demo",
    one_liner: "九阶段 E2E 自动化回归：一键验证全流程工件生成、门控通过与 CI 集成",
    features: [
      "As a developer, I want the E2E workflow to validate all nine phases so that I trust every release",
      "As a CI maintainer, I want automated gate verification so that human errors are caught early",
      "As a contributor, I want example artifacts I can inspect so that I understand the workflow without reading source code",
    ],
    scope_v1: [
      "Nine-phase workflow runs to completion",
      "All gates pass including quality and human",
      "example/ 内可复现的 inplace 验证脚本",
      "verify-report.json 含 ok/errors/stepCount",
    ],
    scope_v2: [
      "External test runner integration (non-Vitest)",
      "Browser E2E smoke tests via Playwright",
      "CI matrix across 4 platforms (OpenCode/Claude/Codex/Cursor)",
    ],
    scope_out: [
      "Production deployment changes",
      "Multi-tenant support",
      "UI/frontend components",
    ],
    functional_requirements: [
      {
        module: "Workflow Engine",
        items: [
          { id: "FR-01", description: "E2E test validates all nine phases complete from init to archive" },
          { id: "FR-02", description: "Gates pass including quality and human approvals" },
          { id: "FR-03", description: "Phase artifacts are generated with correct content (markdown + JSON)" },
        ],
      },
      {
        module: "Example Scripts",
        items: [
          { id: "FR-04", description: "run-inplace-verify.mjs writes .taiyi/archive/ with 11/11 expected files" },
          { id: "FR-05", description: "verify-report.json contains generatedAt/ok/errors/stepCount" },
        ],
      },
    ],
    non_functional: {
      performance: [
        { id: "NFR-P01", description: "全流程 E2E < 60s" },
        { id: "NFR-P02", description: "单阶段 artifact 写入 < 500ms" },
      ],
      security: [
        { id: "NFR-S01", description: "无硬编码密钥/令牌" },
        { id: "NFR-S02", description: "state.json 不包含敏感路径信息" },
      ],
      availability: [
        { id: "NFR-A01", description: "CI 可用性 99%+" },
      ],
    },
    acceptance_criteria: [
      { id: "AC-01", description: "State shows integration completed", is_checked: true, verify: "taiyi-forge.sh status --json --compact | grep completed" },
      { id: "AC-02", description: "Artifact count equals expected 11 files", is_checked: true, verify: "ls .taiyi/changes/*/CHANGE.md .taiyi/changes/*/REQUIREMENT.md .taiyi/changes/*/state.json | wc -l" },
      { id: "AC-03", description: "verify-report.json ok:true with zero errors", is_checked: true, verify: "cat verify-report.json | grep -q '\"ok\": true'" },
    ],
    error_rescue_map: [
      { error: "CLI 参数错误", trigger: "无效参数", catch: "commander", user_sees: "错误提示+用法", recovery: "重新输入" },
      { error: "state.json 格式错误", trigger: "手动修改 state", catch: "Zod schema 校验", user_sees: "校验失败提示", recovery: "回退 state 备份" },
      { error: "模板丢失", trigger: "散装项目缺少 .hbs", catch: "回退到硬编码 md", user_sees: "生成完整但无模板增强", recovery: "安装模板目录" },
    ],
    shadow_paths: [
      {
        flow: "E2E Workflow",
        happy_input: "完整九阶段输入", happy_expected: "全部通过+门禁绿",
        nil_input: "空输入", nil_expected: "CLI 提示用法",
        empty_input: "空 workspace", empty_expected: "初始化 change",
        upstream_input: "上游 CI 取消", upstream_expected: "跳过回归标记",
      },
      {
        flow: "Artifact Verification",
        happy_input: "生成 11/11 文件", happy_expected: "verify ok",
        nil_input: "空 change 目录", nil_expected: "assertExpectedArtifacts 报 missing",
        empty_input: "部分文件缺失", empty_expected: "assert 列出缺失文件清单",
        upstream_input: "profile 跳过阶段", upstream_expected: "缩小 expectedArtifacts",
      },
    ],
    non_happy_path_cases: [
      { scenario: "空输入", behavior: "显示用法提示" },
      { scenario: "无效 slug", behavior: "报错退出" },
      { scenario: "跳过阶段", behavior: "缩小验证范围" },
      { scenario: "不完整工件", behavior: "assert 失败并提示缺失文件" },
    ],
    dependencies: [
      { dependency: "vitest", type: "测试框架", status: "已安装", risk: "无" },
      { dependency: "handlebars", type: "模板引擎", status: "已安装", risk: "无" },
      { dependency: "commander", type: "CLI 框架", status: "已安装", risk: "无" },
      { dependency: "zod", type: "校验库", status: "已安装", risk: "无" },
    ],
    security_compliance: ["npm audit 无 critical/high", "无硬编码密钥", "测试数据无 PII"],
    evidence: {
      command: "taiyi-forge.sh status --json --compact",
      exitCode: 0,
      capturedAt: "2026-06-22T12:00:00Z",
    },
  },
  design: {
    title: "E2E Demo",
    techStack: {
      selected: "Node.js + TypeScript + Vitest",
      reason: "Consistent with project stack; no new runtime dependencies",
      frontend: "N/A (CLI-only change)",
      backend: "Node.js + Commander",
      database: "N/A (file-based state)",
      deployment: "npm registry / GitHub Actions",
      keyDeps: "handlebars, zod, vitest, commander",
      excluded: "Docker, Kubernetes (无容器化需求)",
      constraints: "Node 18+; macOS/Linux CI; 仅新增测试依赖无生产依赖变更",
    },
    current_state: "当前项目已有 WorkflowEngine + phase-registry + template-engine 核心模块，但缺少 E2E 全流程覆盖。单元测试覆盖各模块内部逻辑，但无跨九阶段的集成验证。",
    existingArchitecture: {
      touchedModules: ["src/core/workflow-engine.ts", "src/core/phase-registry.ts", "src/core/run-slash-flow-cli.ts"],
      newModules: ["src/core/e2e-fixtures.ts"],
      doNotTouch: ["src/core/types.ts"],
    },
    modules: [
      { name: "E2E Fixtures", operation: "新增", path: "src/core/e2e-fixtures.ts", description: "E2E 测试夹具数据" },
      { name: "Workflow Engine", operation: "修改", path: "src/core/workflow-engine.ts", description: "E2E 流程编排" },
      { name: "Phase Registry", operation: "读取", path: "src/core/phase-registry.ts", description: "阶段定义与依赖" },
      { name: "Verify Logic", operation: "修改", path: "src/core/run-slash-flow-cli.ts", description: "验收报告生成 (writeVerifyReport)" },
    ],
    dependency_sandbox: [
      { name: "vitest", version_range: "^2.0", purpose: "测试框架（含 E2E 夹具）", alternatives_considered: "jest（配置更重）", npm_latest: "2.1.0", staleness_check: "✅" },
      { name: "handlebars", version_range: "^4.7", purpose: "模板引擎（渲染夹具到工件）", alternatives_considered: "ejs, pug（团队不熟悉）", npm_latest: "4.7.8", staleness_check: "✅" },
      { name: "zod", version_range: "^3.23", purpose: "数据校验", alternatives_considered: "yup（功能相近，生态略弱）", npm_latest: "3.24.0", staleness_check: "✅" },
    ],
    options: [
      { id: "A", name: "Inline script", approach: "Bash 脚本直调 taiyi-forge.sh，手动验证", pros: ["Fast", "Simple"], cons: ["Manual", "No CI"], cost: "Low" },
      { id: "B", name: "Vitest only", approach: "Vitest 全量测试含 E2E 夹具，CI 自动回归", pros: ["CI", "Automated"], cons: ["No CLI"], cost: "Low" },
    ],
    decision: { chosen: "B", reason: "Automated regression in every release." },
    blast_radius: [
      { decision: "Vitest-based E2E", radius: "低", worst_case: "E2E 假阳性误拦CI", isolation: "独立测试文件，不影响业务代码" },
    ],
    design_innovation_tokens: [
      { decision: "无新技术", is_token: false, reason: "全栈已有技术栈" },
    ],
    tradeoffs: [
      { point: "测试框架选型", choice: "Vitest", reason: "与项目构建工具链一致，零额外依赖" },
      { point: "夹具硬编码 vs 模板渲染", choice: "模板渲染", reason: "与真实执行路径一致，避免双轨漂移" },
    ],
    new_artifact: "verify-report.json（验收报告）",
    rollback_trigger: "E2E 测试持续失败 (>2 次重试) 或 verify-report 出现 error",
    rollout_steps: [
      "合并 PR 到 main 分支",
      "CI 自动运行全量测试（含 E2E）",
      "npm publish（含语义化版本号）",
      "运行 npm run check:docs 确保命令表与文档同步",
    ],
    security_threats: [
      { threat: "Spoofing", vector: "伪造 CLI 参数", mitigation: "Commander 参数校验" },
      { threat: "Tampering", vector: "篡改 state.json", mitigation: "SHA256 hash 快照校验" },
    ],
    evolutionSuggestions: [
      { type: "reusable-abstraction" as const, description: "Extract E2E fixture pattern to shared test-utils" },
    ],
  },
  "ui-design": {
    title: "E2E Demo",
    scope: "CLI/workflow only; no user interface surfaces.",
    is_cli_only: true,
    states: [
      { name: "N/A", description: "CLI-only change, no UI state machine" },
    ],
    accessibility: ["N/A — CLI only", "No visual interface to audit"],
    links: ["DESIGN.md: inline script vs vitest", "REQUIREMENT.md AC: US-1"],
  },
  task: {
    title: "E2E Demo",
    total_slices: 2,
    estimated_days: "3d",
    max_parallel: 2,
    slices: [
      {
        id: "S1",
        label: "E2E workflow test",
        description: "Vitest-based E2E that validates all nine phases complete with gates passing. Seeds change artifacts via E2E_ARTIFACTS fixtures, runs completePhase for each, and asserts final workflowStatus === 'completed'.",
        read_files: ["src/core/workflow-engine.ts", "src/core/e2e-fixtures.ts", "src/core/run-e2e-workflow.ts"],
        write_files: ["tests/e2e-workflow.test.ts"],
        test_command: "npm test -- tests/e2e-workflow.test.ts",
        dependencies: "",
        parallelizable: true,
        completeness_score: 9,
        physical_verification: "git diff --name-only",
        checkpoints: [
          "All nine phases complete in state.json",
          "Gates pass without manual intervention",
          "Verify report generated with ok:true",
          "11/11 expected artifacts present on disk",
        ],
      },
      {
        id: "S2",
        label: "Inplace verify demo script",
        description: "Node.js script that runs the full SlashFlow in examples/full-flow-demo/.taiyi/archive/ and writes verify-report.json for human inspection.",
        read_files: ["src/core/run-slash-flow-cli.ts", "examples/full-flow-demo/scripts/run-inplace-verify.mjs"],
        write_files: ["examples/full-flow-demo/scripts/run-inplace-verify.mjs"],
        test_command: "node examples/full-flow-demo/scripts/run-inplace-verify.mjs",
        dependencies: "S1",
        parallelizable: false,
        completeness_score: 8,
        physical_verification: "git diff --name-only",
        checkpoints: [
          "Archive dir has 11 files",
          "verify-report.json shows ok:true",
          "Example appears in docs/QUICKSTART.md runnable list",
        ],
      },
    ],
    waves: [
      { name: "1 (无依赖,并行)", slices: [{ slice_id: "S1", description: "e2e workflow test" }] },
      { name: "2 (依赖 S1)", slices: [{ slice_id: "S2", description: "inplace verify demo script" }] },
    ],
    slice_risks: [
      { slice: "S1", risk: "E2E 假阳性", probability: "中", mitigation: "CI 重试 + 人工确认" },
      { slice: "S2", risk: "夹具数据漂移", probability: "低", mitigation: "E2E_ARTIFACTS 作为唯一真源" },
    ],
    slice_rollbacks: [
      { slice: "S1", rollback: "git revert", time: "≤5 min", data_impact: "无数据影响" },
      { slice: "S2", rollback: "git revert", time: "≤5 min", data_impact: "无数据影响" },
    ],
  },
  test: {
    title: "E2E Demo",
    unit_framework: "vitest",
    unit_coverage_target: "85%",
    test_plan: [
      { id: "T-01", description: "workflow smoke — 9 phases complete", status: "passed" as const },
      { id: "T-02", description: "assertExpectedArtifacts — missing file detection", status: "passed" as const },
      { id: "T-03", description: "template fallback — no .hbs returns hardcoded md", status: "passed" as const },
    ],
    edge_cases: [
      { scenario: "并发执行多个 taiyi CLI", tc: "TC-E01", status: "⚠ N/A" },
      { scenario: "空模板目录", tc: "TC-E02", status: "✅ fallback to hardcoded md" },
      { scenario: "profile=api 跳过 ui-design", tc: "TC-E03", status: "✅ expected artifacts reduced" },
      { scenario: "无效 change slug (含空格)", tc: "TC-E04", status: "✅ CLI 报错退出" },
    ],
    performance_tests: [
      { scenario: "全量 e2e-workflow", target: "< 60s 总耗时", tool: "vitest", result: "✅ ~35s" },
      { scenario: "单阶段 artifact write", target: "< 500ms", tool: "vitest benchmark", result: "✅ ~80ms" },
    ],
    security_checks: ["npm audit 无 critical/high", "无硬编码密钥/令牌"],
    regression_plan: [
      { scope: "全量 vitest", cases: "780+", method: "npm test", owner: "CI" },
      { scope: "E2E workflow", cases: "1 suite", method: "npm test -- tests/e2e-workflow.test.ts", owner: "CI" },
    ],
    regression_items: [
      { item: "全量 vitest", old_behaviour: "126 pass", new_behaviour: "126 pass", test: "npm test", red_green: "✅", status: "✅" },
      { item: "template rendering", old_behaviour: "N/A", new_behaviour: "data-rich fixtures", test: "npm test", red_green: "✅", status: "✅" },
    ],
    summary: "All required test suites pass. No flaky tests introduced. E2E fixture content enriched to demonstrate production-quality artifact depth.",
    coverage: "126 test files, 780+ tests across unit/integration/E2E. New E2E smoke covers all 9 phases with gate verification.",
    evidence: {
      command: "taiyi-forge.sh status --json --compact",
      exitCode: 0,
      capturedAt: "2026-06-22T12:00:00Z",
    },
  },
  review: {
    title: "E2E Demo",
    review_date: "2026-06-22",
    verdict: "approved" as const,
    findings: [
      { id: "F1", severity: "low", description: "Docs only — no code changes needed", resolved: true },
    ],
    blocking_items: [],
    suggestion_items: ["考虑提取 E2E 夹具到独立 test-utils 包"],
    code_quality: [
      { dimension: "可读性", score: "8", note: "模板注释清晰，字段命名一致" },
      { dimension: "可测试性", score: "10", note: "126 文件 780+ 用例全覆盖" },
      { dimension: "一致性", score: "9", note: "全模板 Step 编号统一" },
      { dimension: "复杂度", score: "7", note: "Handlebars 条件分支较多" },
      { dimension: "文档", score: "8", note: "每 Step 含 Goal/Inputs/Action/Validate" },
    ],
    test_coverage: [
      { layer: "单元", passed: "780", total: "781", coverage: "99%", status: "✅ passed" },
      { layer: "集成", passed: "N/A", total: "N/A", coverage: "N/A", status: "— CLI only" },
      { layer: "E2E", passed: "1", total: "1", coverage: "100%", status: "✅ passed" },
    ],
    security_audit: ["npm audit 通过", "无敏感数据日志", "测试数据无 PII"],
    performance_audit: [
      { item: "N+1 查询", status: "N/A", note: "无数据库操作" },
      { item: "阻塞 I/O", status: "N/A", note: "文件操作为同步，但数据量极小" },
    ],
    summary: "E2E smoke for nine-phase TaiyiForge workflow. No blocking issues.",
  },
  integration: {
    title: "E2E Demo",
    release_version: "1.0.0",
    release_date: "2026-06-22",
    status: "deployed",
    has_config_changes: false,
    changelog_entries: [
      { type: "test" as const, description: "E2E workflow regression test and dogfood script covering all nine phases." },
      { type: "refactor" as const, description: "E2E_ARTIFACTS fixtures enriched with production-quality content depth (更多 FR/AC, visual_* fields, richer design options)." },
      { type: "docs" as const, description: "full-flow-demo example now generates inspectable artifacts in .taiyi/archive/." },
    ],
    breaking_changes: [],
    dashboard_url: "GitHub Actions CI Dashboard",
    alerts: [
      { alert: "E2E 失败", condition: "vitest 非零退出", severity: "high", channel: "GitHub Actions / Slack" },
      { alert: "工件数不匹配", condition: "文件数 != 预期", severity: "medium", channel: "GitHub Actions" },
    ],
    post_launch: {
      period: "24h",
      metrics: "CI pass rate, E2E 耗时, artifact count",
      exit_criteria: "24h 内 E2E pass rate = 100%, 工件完整",
      incident_response: "Slack #eng-alerts → on-call 处理",
    },
    rollback_trigger: "E2E 测试持续失败 (>2 次重试) 或 verify-report 出现 error",
    rollback_step1: "git revert HEAD~1",
    rollback_step2: "npm test && npm run build 确认通过",
    rollback_time: "5min",
    monitoring: [
      { metric: "E2E pass rate", baseline: "100%", threshold: "<100%", severity: "high" },
      { metric: "CI 耗时", baseline: "~35s", threshold: ">60s", severity: "medium" },
      { metric: "artifact count", baseline: "11", threshold: "<11", severity: "medium" },
    ],
  },
};

/** Minimal valid artifact bodies for E2E / dogfood (pass artifact-validator). */
export const E2E_ARTIFACTS: Record<Exclude<PhaseId, "dev">, { md: string; json: object }> = {
  change: {
    md: `# CHANGE: E2E Demo

## Motivation
Validate TaiyiForge nine-phase workflow end-to-end in CI and dogfood runs.

## Scope
- In: workflow engine smoke
- Out: production features

## Risks
Low — docs and state only.

## Success Criteria
- [x] All nine phases complete with gates passing
`,
    json: E2E_JSON_ARTIFACTS.change,
  },
  requirement: {
    md: `# REQUIREMENT: E2E Demo

## User Stories

| ID | As a… | I want… | So that… |
|----|--------|---------|----------|
| US-1 | developer | run e2e | I trust releases |

## Acceptance Criteria (Given / When / Then)

### US-1

- **Given** a fresh change slug
- **When** I complete each phase with valid artifacts
- **Then** state shows integration completed

## Traceability

| AC | Links to CHANGE.md |
|----|-------------------|
| US-1 | Success Criteria |

## Out of Scope

External npm registry in this test only.
`,
    json: E2E_JSON_ARTIFACTS.requirement,
  },
  design: {
    md: `# DESIGN: E2E Demo

## Context

Dogfood validates WorkflowEngine and validators.

## Reuse Analysis

Reviewed existing pieces before composing this flow:

- Reuses \`WorkflowEngine.completePhase\` gate pipeline already exercised by unit suites.
- Reuses existing \`artifact-validator\` scores (completeness / consistency / verifiability / traceability / engineering_quality).
- No new reusable modules required: change is documentation + harness orchestration only.

## Options

| Option | Summary | Pros | Cons | Cost |
|--------|---------|------|------|------|
| A | Inline script | Fast | Manual | Low |
| B | Vitest only | CI | No CLI | Low |

## Decision

**Chosen:** Option B for CI, script for local dogfood.

**Reason:** Picks Vitest because it gives reproducible CI 性能 (sub-second suite spin-up) at the cost of one extra dependency. Tradeoff accepted: a 复杂度-neutral harness that aligns with our existing 测试 pipeline, no new runtime cost in production.

## Architecture

\`\`\`text
init → write artifacts → complete × 9
\`\`\`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Validator drift | Shared E2E_ARTIFACTS fixture |

## Open Questions

- [ ] None for smoke test
`,
    json: E2E_JSON_ARTIFACTS.design,
  },
  "ui-design": {
    md: `# UI-DESIGN: E2E Demo

## Scope

N/A — this dogfood change is CLI/workflow only; no user interface surfaces.

## Layout & Hierarchy

Not applicable.

## States

| State | Behavior |
|-------|----------|
| n/a | CLI only |

## Accessibility

- [x] N/A documented

## Links

- DESIGN.md: inline script vs vitest
- REQUIREMENT.md AC: US-1
`,
    json: E2E_JSON_ARTIFACTS["ui-design"],
  },
  task: {
    md: `# TASK: E2E Demo

## Slices (vertical, smallest shippable first)

| # | Slice | Depends | Done when |
|---|-------|---------|-----------|
| 1 | e2e test | — | vitest green |

## Checklist per slice

- [x] 测试先行（RED）
- [x] 最小实现（GREEN）
- [x] 重构（REFACTOR）
- [x] 更新追溯（REQUIREMENT AC）

## Non-goals (this change)

Shipping application UI.
`,
    json: E2E_JSON_ARTIFACTS.task,
  },
  test: {
    md: `# TEST: E2E Demo

## Test Plan

| Level | Scope | Command / Tool |
|-------|-------|----------------|
| unit | workflow | npm test |

## Coverage vs AC

| AC (REQUIREMENT) | Test evidence |
|------------------|---------------|
| US-1 | tests/e2e-workflow.test.ts |

## Results

- [x] All required suites pass
- [x] No flaky tests introduced

## Gaps / Follow-ups

None for smoke.
`,
    json: E2E_JSON_ARTIFACTS.test,
  },
  review: {
    md: `# REVIEW: E2E Demo

## Summary

E2E smoke for nine-phase TaiyiForge workflow.

## Findings

| Severity | File / Area | Issue | Suggestion |
|----------|-------------|-------|------------|
| low | docs | — | — |

## Security & Trust

- [x] 输入校验 / 鉴权边界 N/A
- [x] 无硬编码密钥

## Verdict

- [x] **Approve** — 可合并
`,
    json: E2E_JSON_ARTIFACTS.review,
  },
  integration: {
    md: `# CHANGELOG: E2E Demo

## Added

- E2E workflow regression test and dogfood script.

## Changed

- Release process includes full phase walkthrough.

## Fixed

- N/A

## Docs / Skills

- [x] README / AGENTS.md 已同步（若对外行为变化）
- [ ] OpenSpec / 规格已 archive（若适用）

## Rollback

Revert commit; no schema migration.
`,
    json: E2E_JSON_ARTIFACTS.integration,
  },
};

export const E2E_PHASE_ORDER: PhaseId[] = listPhases().map((p) => p.id);

// ── ADVANCED 级别夹具：含 module_manifest + code_style，用于验证完整代码生成链 ──

export const ADVANCED_CODE_STYLE = {
  type_hints: true,
  docstrings: true,
  error_handling: "defensive" as const,
  logging_style: "json" as const,
  request_tracing: true,
  prompt_engineering: "advanced" as const,
};

export const ADVANCED_MODULE_MANIFEST = [
  {
    id: "M1", file: "adapters/base.py", pattern: "Adapter" as const,
    class_name: "LLMAdapter", depends_on: [],
    methods: [
      { name: "complete", return_type: "str", is_abstract: true },
      { name: "stream_complete", return_type: "AsyncIterator[str]", is_abstract: true },
    ],
    constraints: ["type hints mandatory", "module-level docstring"],
  },
  {
    id: "M2", file: "adapters/openai_adapter.py", pattern: "Adapter" as const,
    class_name: "OpenAIAdapter", extends: "LLMAdapter", depends_on: ["M1"],
    methods: [
      { name: "complete", return_type: "str", is_abstract: false },
      { name: "stream_complete", return_type: "AsyncIterator[str]", is_abstract: false },
    ],
    constraints: ["handle API errors with AdapterException", "support custom base_url", "timeout + retry config"],
  },
  {
    id: "M3", file: "strategies/base.py", pattern: "Strategy" as const,
    class_name: "TranslationStrategy", depends_on: [],
    methods: [
      { name: "get_system_prompt", return_type: "str", is_abstract: true },
      { name: "format_prompt", return_type: "str", is_abstract: true },
      { name: "get_direction_name", return_type: "str", is_abstract: true },
    ],
    prompt_style: "advanced" as const,
    constraints: ["@abstractmethod all three methods"],
  },
  {
    id: "M4", file: "strategies/product_to_dev.py", pattern: "Strategy" as const,
    class_name: "ProductToDevStrategy", extends: "TranslationStrategy", depends_on: ["M3"],
    methods: [
      { name: "get_system_prompt", return_type: "str", is_abstract: false },
      { name: "format_prompt", return_type: "str", is_abstract: false },
      { name: "get_direction_name", return_type: "str", is_abstract: false },
    ],
    prompt_style: "advanced" as const,
    constraints: ["80-120 lines", "XML tags + CoT in prompt", "structured output format"],
  },
  {
    id: "M5", file: "strategies/dev_to_product.py", pattern: "Strategy" as const,
    class_name: "DevToProductStrategy", extends: "TranslationStrategy", depends_on: ["M3"],
    methods: [
      { name: "get_system_prompt", return_type: "str", is_abstract: false },
      { name: "format_prompt", return_type: "str", is_abstract: false },
      { name: "get_direction_name", return_type: "str", is_abstract: false },
    ],
    prompt_style: "advanced" as const,
    constraints: ["80-120 lines", "focus on business value translation"],
  },
  {
    id: "M6", file: "services/llm_service.py", pattern: "Service" as const,
    class_name: "LLMService", depends_on: ["M2"],
    methods: [
      { name: "translate", return_type: "str", is_abstract: false },
      { name: "translate_stream", return_type: "AsyncIterator[str]", is_abstract: false },
    ],
    constraints: ["structured JSON logging", "request_id propagation"],
  },
  {
    id: "M7", file: "services/translation_service.py", pattern: "Service" as const,
    class_name: "TranslationService", depends_on: ["M3", "M4", "M5", "M6"],
    methods: [
      { name: "translate", return_type: "str", is_abstract: false },
      { name: "translate_stream", return_type: "AsyncIterator[str]", is_abstract: false },
    ],
    constraints: ["factory pattern for strategy selection", "input validation", "empty result handling"],
  },
  {
    id: "M8", file: "controllers/translation_controller.py", pattern: "Controller" as const,
    class_name: "router", depends_on: ["M7"],
    methods: [
      { name: "translate", return_type: "JSONResponse", is_abstract: false },
      { name: "translate_stream", return_type: "StreamingResponse", is_abstract: false },
    ],
    constraints: ["Pydantic model validation", "rate limit placeholder"],
  },
  {
    id: "M9", file: "middleware/logging.py", pattern: "Middleware" as const,
    class_name: "LoggingMiddleware", depends_on: [],
    methods: [
      { name: "dispatch", return_type: "Response", is_abstract: false },
    ],
    constraints: ["JSON structured logs", "request_id injection via contextvars"],
  },
  {
    id: "M10", file: "config/settings.py", pattern: "Config" as const,
    class_name: "Settings", depends_on: [],
    methods: [],
    constraints: ["pydantic-settings BaseSettings", "env var validation", "type coercion"],
  },
  {
    id: "M11", file: "models/request.py", pattern: "Model" as const,
    class_name: "TranslationRequest", depends_on: [],
    methods: [],
    constraints: ["Pydantic BaseModel", "Field validators", "example doc"],
  },
  {
    id: "M12", file: "models/response.py", pattern: "Model" as const,
    class_name: "TranslationResponse", depends_on: [],
    methods: [],
    constraints: ["Pydantic BaseModel", "model_config"],
  },
  {
    id: "M13", file: "controllers/health_controller.py", pattern: "Health" as const,
    class_name: "health_router", depends_on: ["M10"],
    methods: [
      { name: "health", return_type: "dict", is_abstract: false },
      { name: "ready", return_type: "JSONResponse", is_abstract: false },
      { name: "live", return_type: "dict", is_abstract: false },
    ],
    constraints: ["/health, /ready, /live 三个端点", "ready 含依赖检查", "Kubernetes 兼容"],
  },
  {
    id: "M14", file: "main.py", pattern: "Main" as const,
    class_name: "app", depends_on: ["M8", "M9", "M13"],
    methods: [],
    constraints: ["CORS middleware", "middleware ordering (logging→timing→error)", "router registration", "root endpoint"],
  },
  {
    id: "M15", file: "services/metrics_service.py", pattern: "Metrics" as const,
    class_name: "MetricsService", depends_on: [],
    methods: [
      { name: "record_request", return_type: "None", is_abstract: false },
      { name: "record_error", return_type: "None", is_abstract: false },
      { name: "get_metrics", return_type: "dict", is_abstract: false },
    ],
    constraints: ["singleton pattern (__new__ + _lock)", "thread-safe counters", "p50/p95/p99 latency"],
  },
  {
    id: "M16", file: "core/exception_handler.py", pattern: "ExceptionHandler" as const,
    class_name: "setup_exception_handlers", depends_on: [],
    methods: [],
    constraints: ["registers 5 handlers (400/404/502/500/unhandled)", "JSON error responses"],
  },
  {
    id: "M17", file: "middleware/response_time.py", pattern: "ResponseTimeMiddleware" as const,
    class_name: "ResponseTimeMiddleware", depends_on: [],
    methods: [
      { name: "dispatch", return_type: "Response", is_abstract: false },
    ],
    constraints: ["X-Response-Time header", "slow request warning at 1000ms"],
  },
  // Remaining 4 translation strategies (completing the 6-strategy set from README)
  {
    id: "M18", file: "strategies/dev_to_ops.py", pattern: "Strategy" as const,
    class_name: "DevToOpsStrategy", extends: "TranslationStrategy", depends_on: ["M3"],
    methods: [
      { name: "get_system_prompt", return_type: "str", is_abstract: false },
      { name: "format_prompt", return_type: "str", is_abstract: false },
      { name: "get_direction_name", return_type: "str", is_abstract: false },
    ],
    prompt_style: "advanced" as const,
    constraints: ["focus on business value translation for ops"],
  },
  {
    id: "M19", file: "strategies/ops_to_dev.py", pattern: "Strategy" as const,
    class_name: "OpsToDevStrategy", extends: "TranslationStrategy", depends_on: ["M3"],
    methods: [
      { name: "get_system_prompt", return_type: "str", is_abstract: false },
      { name: "format_prompt", return_type: "str", is_abstract: false },
      { name: "get_direction_name", return_type: "str", is_abstract: false },
    ],
    prompt_style: "advanced" as const,
    constraints: ["technical implementation planning for ops requirements"],
  },
  {
    id: "M20", file: "strategies/product_to_ops.py", pattern: "Strategy" as const,
    class_name: "ProductToOpsStrategy", extends: "TranslationStrategy", depends_on: ["M3"],
    methods: [
      { name: "get_system_prompt", return_type: "str", is_abstract: false },
      { name: "format_prompt", return_type: "str", is_abstract: false },
      { name: "get_direction_name", return_type: "str", is_abstract: false },
    ],
    prompt_style: "advanced" as const,
    constraints: ["product requirements → ops strategy translation"],
  },
  {
    id: "M21", file: "strategies/ops_to_product.py", pattern: "Strategy" as const,
    class_name: "OpsToProductStrategy", extends: "TranslationStrategy", depends_on: ["M3"],
    methods: [
      { name: "get_system_prompt", return_type: "str", is_abstract: false },
      { name: "format_prompt", return_type: "str", is_abstract: false },
      { name: "get_direction_name", return_type: "str", is_abstract: false },
    ],
    prompt_style: "advanced" as const,
    constraints: ["ops requirements → product feature translation"],
  },
  {
    id: "M22", file: "middleware/error_handler.py", pattern: "ErrorHandlerMiddleware" as const,
    class_name: "ErrorHandlerMiddleware", depends_on: [],
    methods: [{ name: "dispatch", return_type: "Response", is_abstract: false }],
    constraints: ["catch-all error handler", "JSON error responses", "method+path+status logging"],
  },
  {
    id: "M23", file: "controllers/metrics_controller.py", pattern: "Controller" as const,
    class_name: "metrics_router", depends_on: ["M15"],
    methods: [
      { name: "get_metrics", return_type: "JSONResponse", is_abstract: false },
      { name: "get_metrics_summary", return_type: "dict", is_abstract: false },
    ],
    constraints: ["/api/metrics 端点", "summary 简化版", "prometheus-ready 格式"],
  },
];

/** ADVANCED 级别 E2E 夹具：design/task 阶段含完整 module_manifest + code_style */
export const E2E_ARTIFACTS_ADVANCED: Record<"design" | "task", { md: string; json: object }> = {
  design: {
    md: E2E_ARTIFACTS.design.md,
    json: { ...E2E_JSON_ARTIFACTS.design, code_style: ADVANCED_CODE_STYLE, module_manifest: ADVANCED_MODULE_MANIFEST },
  },
  task: {
    md: E2E_ARTIFACTS.task.md,
    json: { ...E2E_JSON_ARTIFACTS.task, code_style: ADVANCED_CODE_STYLE, module_manifest: ADVANCED_MODULE_MANIFEST },
  },
};
