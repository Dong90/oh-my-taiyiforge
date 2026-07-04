# Changelog

> 📦 较早的变更已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。

<!-- taiyi:registry-refactor --> 2026-06-30
# CHANGELOG: registry-refactor

## Added

- 5 个统一的 `Registry<T>` 抽象类，统一支持 builtin + YAML + node_modules(package.json) + programmatic 四类来源
  - `src/core/profile-registry.ts` — ProfileRegistry（7 个 builtin profile，支持 extends + 循环检测、YAML、nm 扫描）
  - `src/core/code-pattern-registry.ts` — CodePatternRegistry（13 个 builtin pattern，YAML、nm 扫描、code-gen 集成）
  - `src/core/ssot-rule-registry.ts` — SSOTRuleRegistry（12 个 builtin rule，ID-reference 取代位置配对）
  - `src/core/extractor-registry.ts` — ExtractorRegistry（8 个 builtin extractor，loader.ts 委托）
  - `src/core/runner-policy-registry.ts` — RunnerPolicyRegistry（4 个 preset + 2 个 helper，含 `selectRunnerForPolicy`）
- 公共导出：5 个 Registry 类 + `getDefault*` / `resetDefault*` 工厂，从 `src/index.ts` 全部 re-export
- 12 个新测试文件覆盖 registry 行为（builtin 保护、优先级覆盖、YAML 加载、循环检测、ID 引用等）

## Changed

- 5 处硬编码结构替换为 registry 委托，老调用点行为不变：
  - `PROFILE_SKIPPED`（`auto/profile-keywords.ts`）→ 改为 derived view，不再维护 snapshot
  - `PATTERN_TO_TEMPLATE`（`code-pattern.ts`）→ CodePatternRegistry 单源
  - `EDGE_CATALOG`（`ssot-rules.ts`）→ SSOTRuleRegistry + ID 引用
  - `EXTRACTORS` Map（`extractors/`）→ ExtractorRegistry
  - runner cluster（`runner-clusters.ts`）→ RunnerPolicyRegistry
- 老 API（`buildEdges` / `detectSSOTViolations` / `loader.ts` / `runner-clusters.ts` 等）改为薄壳委托到 registry
- 统一 `register()` 守护风格（id 非空 + 来源检查）
- `console.warn` 全部切换到 `getLogger().warn`
- 删 `SEVERITY_MAP` 重复定义
- 删 dead `setDefaultTemplatesDir`

## Deprecated（V1.1 路线图）

- `yaml` 外部包引入 —— 仍走自研 parser 扩展
- 远程 YAML 加载 —— TODO
- `KEYWORD_PROFILE`（auto-plan）重写 —— 老路径仍工作
- 删除老 `PROFILE_SKIPPED` 实体 —— V1.1 切换为纯 derived view

## Fixed

- 5 个 builtin 集合由「散在多文件」变为「单一可枚举源」，降低后续添加成本
- 跨模块的 ID/字段命名漂移通过 ID-reference 修复（如 SSOT 规则不再依赖数组下标）

## Tests

- 1210 → **1296 passed**（+86，12 个新测试文件）
- TypeScript: 0 errors

## Rollback

```
git revert 2c725ff
```

<!-- taiyi:agent-mode-translation-api-backend-core --> 2026-06-27
# CHANGELOG: agent-mode-translation-api-backend-core

## Unreleased (merged from plan #1-#5 + registry-refactor)

### Changed
- 退出 GStack 主路径：交付链由 native `git + gh` 驱动，配置层新增 `docs/taiyi/delivery.yaml`（默认）+ `.taiyi/delivery.yaml`（项目覆盖）；harness 改用 Superpowers + ECC 双线（架构 / 代码审查 / QA / 发版 / 漏洞扫描 / 站点 QA / 会话 checkpoint / TDD 文档 全部由 ECC 覆盖，详见 `docs/taiyi/library-selection.md`）。旧 `scripts/install-optimal-fusion.sh` 已删除；`/taiyi:ship` `/taiyi:land` `/taiyi:commit` 退化为 chat-only 斜杠（CLI 报 exit 2 + chat-slash-only 提示）。
- `scripts/taiyi-forge.sh ship|land|commit` 不再转发到 node CLI，直接打印 chat-slash 提示。
- `src/core/harness-runner.ts` archive 命令匹配由 `command.includes("archive")` 改为 `tool === "taiyi" && command.startsWith("taiyi archive")`，避免误触发。
- `src/core/gates/delivery-gate.ts` 新仓库 base 检测由静默通过改为显式 fail + hints，提示先 `git push` 或 `git init`。

### Added
- `src/core/delivery-config.ts` `parseDeliveryYaml` 改用 `yaml@2.9.0` 标准库（替原 180 行手写正则 parser）+ 强类型守卫 + fail-soft。
- `src/core/delivery-plan.ts` `planDeliveryChain` 暴露 `DeliveryPlan.steps[]`，作为 `/taiyi:ship` `/taiyi:land` 的预览真源。
- `scripts/check-md-links.mjs` 纳入 + `npm run check:links`：扫描 markdown 内部链接，URL 含 `=` `,` 或形如 `<word>:<text>` 的模板占位符跳过；当前 baseline 5 个历史 broken（CONTRIBUTING.md / skill-fusion-principles.md / configuration.md / delivery-slash.md / diagrams/pipeline.md）将在后续清理。

### Notes (state.json 字段漂移 — 已知不修)
- `seeded` 字段：`initChange()` 返回对象的临时字段（`src/core/workflow-engine.ts:116,176`），**不应持久化**。现状 `bench-delta-final` / `demo-28-v28` / `lang-test` 3 个 state.json 含此字段为历史 engine bug 残留，**无功能影响**（所有读路径不消费该字段），下次 `writeState` 会自然覆写。
- `version` 字段：OCC 乐观锁字段（`src/core/workflow-engine.ts:218-239`），缺值时 `writeState` 用 `?? 0` 兜底，首次写入升到 1。现状 `bench-delta-final` / `token-bench-micro` 缺此字段，**无功能影响**。
- 5 个 state.json 均为历史数据（OCC 引入前或 engine 早期），建议下次 archive 时由 `archiveTaiyiChange` 路径自然清理 —— **本轮不主动改文件**。

### Removed
- `skills/taiyi-decompose/SKILL.md`（0 引用、未进 manifest 任何阶段）—— `prompts/` 28 个文件 + `prompts/inc/` 5 个文件全部有上游引用，本轮 0 删除。

### Fixed (plan #5: docs ↔ src 一致性同步)
- **handlers.ts ↔ docs 对齐**：`docs/taiyi/canonical-commands.md` 加 §「引擎 CLI 真源」段，列 35 个常用 CLI 子命令 ↔ 引擎函数映射（`src/plugin/handlers.ts` 真源）+ 14 个聊天斜杠 ↔ CLI 真源映射。`/taiyi:external-context` 实际由 `taiyiWorkflowSkill('external-context')` 路由（`src/core/runtime/workflow-skills.ts:135`），文档已正确。`taiyiPause` 走 cli/taiyi.ts:428 dispatch 路由到 `taiyiHandoff`，无需新 handler。
- **环境变量文档化**：`docs/taiyi/configuration.md` §5.1 加 50+ `TAIYI_*` 环境变量表格（按模块分组：引擎 Loop / Hooks / Agent / Human Gate / Token / Daemon / Ralph+Quality / Workflow / MCP+LSP / Logger）。原 §5 仅列 5 个常用变量，现扩到完整对照实现真源。
- **Capability 文档**：`docs/taiyi/integrations.md` §CapabilityId 完整列表加 14 个 capability 行 + 向后兼容 NOTE（9 个"已退场" capability 保留在 `CapabilityId` 类型里以兼容历史 `.taiyi/providers.yaml`）。
- **profile `ui`**：`src/core/builtin-profiles.ts` `ui` profile 加 `auxiliaryHints: ["taiyi-restyle"]`，兑现 docs/USAGE.md §Profile 表中"restyle 默认加载"承诺。

<!-- taiyi:todo-api --> 2026-06-24
# CHANGELOG: todo-api

## Added

- Express CRUD API（6 endpoints）：健康检查、待办增删改查
- 内存 Map 存储（TodoStore），支持所有 CRUD 操作
- 输入校验：空 title 返回 400
- 9 个测试 case，覆盖全量 CRUD + 边界

## Changed

- 无

## Fixed

- 无

<!-- taiyi:todo-e2e --> 2026-06-24
# CHANGELOG: todo-e2e

## Added

- E2E smoke test（`e2e/smoke.test.js`）：自动启动后端、验证健康检查、CRUD 全流程

## Changed

- 无

## Fixed

- 无

<!-- taiyi:todo-ui --> 2026-06-24
# CHANGELOG: todo-ui

## Added

-

## Changed

-

## Fixed

-

## Docs

- [ ] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-

<!-- taiyi:template-translation-api-core-backend --> 2026-06-26
# CHANGELOG: Translation API — Core Backend

## Added

- Translation API: FastAPI-based service with 6 direction-specific LLM strategies
  - product↔dev, dev↔ops, product↔ops bi-directional translation
  - Strategy pattern: each direction has its own system prompt
  - Adapter pattern: pluggable LLM backends (OpenAI default)
  - Streaming SSE endpoint for real-time translation
- Middleware: request logging, error handling, response time tracking
- Tests: 11/11 passing (unit + integration with mocked LLM)
- Pydantic models for request/response validation
- Settings management via pydantic-settings (env-based)

## Changed

- N/A (greenfield change)

## Fixed

- N/A (greenfield change)

## Docs / Skills

- [ ] README / AGENTS.md 已同步（若对外行为变化）
- [ ] OpenSpec / 规格已 archive（若适用）

## Rollback

Revert the `.taiyi/changes/template-translation-api-core-backend/` directory and remove `dev_bundle/` from deployment
path.

## <!-- taiyi:ecc-hybrid-harness --> 2026-07-03
phase: integration skill: taiyi-integration gate: auto produces: CHANGELOG.md upstream: [review, dev, test] downstream:
[]

---

# CHANGELOG: ECC Hybrid 双 harness 走通

> **Release**: v0.23-harness-verify | **Date**: 2026-07-03 | **Status**: verified

---

## Added

- **chore**: 完成 Superpowers + ECC 双线 harness 九阶段端到端验证
- 验证 workflow-manifest.yaml 的 harness 约束：所有 9 个阶段钩子可触发、可打卡
- 验证 3 个 human gate（change/design/review）的 `--approver` 机制正常拦截
- 验证 `harness-check` 命令在 `--auto` 模式下的双线打卡机制

### Breaking Changes

_无_

### Migration

无代码或配置变更。

## Deployment Checklist

- [x] vitest: 176 test files, 1404 tests passed
- [x] tsc --noEmit: 0 errors
- [x] npm audit: no critical/high
- [x] 所有 9 个阶段工件已产出

## Verdict

流程验证通过。双 harness（Superpowers + ECC）在 `--auto` 模式下正常工作。每个阶段的 harness-check 打卡机制正确，human
gate 正确拦截。

---

## Quality Gate

- [x] S1 Changelog 清晰完整
- [x] S1 No breaking changes
- [x] S7 监控: vitest pass rate 100%
