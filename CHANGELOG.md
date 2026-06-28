# Changelog

> 📦 较早的变更已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。

---

## [1.0.0] — 2026-06-28 · First Stable Release

**609 files changed · +28,679 / -987 lines**

> This release graduates TaiyiForge from 30+ pre-release iterations (v0.1–v0.42 + rc.1) into a **stable, production-ready 1.x line**. Every slash command, every phase gate, every workflow mode, every example has been exercised end-to-end.

### 🏗️ Engine Core

- **`/taiyi:plan` Auto-Plan Pipeline** — Input a README / PRD / PDF / URL and the engine decomposes it into independent change modules with recommended profiles and dependency ordering. Auto mode (`--auto`) generates full-stack scaffolding (backends, frontends, tests, migrations) in one go.
- **Code Generation Engine** (`src/core/code-gen.ts`) — Template-driven code generation with wiring auto-detection. Generates FastAPI routers, middleware chains, strategy patterns, adapter interfaces, and tests from manifest.
- **Wiring Detector + Generator** — Automatic FastAPI router registration, middleware ordering, and `__init__.py` wiring across the generated project tree.
- **Architecture Templates** (`src/core/arch-templates.ts`) — 20+ built-in architecture reference templates spanning layered architecture, microservices, event-driven, CQRS, hexagonal ports & adapters.
- **Plan Audit** (`src/core/plan-audit.ts`) — Automated quality review of generated TASK.md plans before execution, blocking on structural issues.
- **Wave Allocator** (`src/core/wave-allocator.ts`) — Parallel execution wave planning for multi-change workflows, respecting inter-change dependencies.
- **Review Architecture Check** (`src/core/review-arch-check.ts`) — Static analysis of code against architecture constraints during review phase.
- **Phase Context** — Improved `PHASE-CONTEXT.md` generation with ~500 token summaries, eliminating need for full artifact reads.
- **Profile System** — 8 profiles (full, api, ui, lite, spike, micro, nano, audit) with correct phase skipping, auxiliary skill routing, and complexity-based recommendations.
- **Human Gate Configuration** — Fine-grained auto-human approval control per phase via config.

### 🧪 Examples & Verification (8 suites)

| Example | What It Validates |
|---------|-------------------|
| `translation-assistant/` | Full-featured LLM translation API: 6-direction strategies, FastAPI + SSE streaming, Docker/nginx deployment. Two variants: `agent/` (AI-generated) + `llm/` (LLM-generated). 83 pytest tests. |
| `todo-fullstack/` | Complete fullstack Todo app (Express CRUD API + vanilla JS frontend + E2E). 10 tests passing. |
| `browser-e2e-smoke/` | Playwright browser E2E smoke test framework with `/taiyi:e2e` alignment. |
| `verification-suite/` | L0–L4 layered verification: `run-all.mjs` covers 151 test files, 1170+ tests in one command. |
| `v28-all-slashes-demo/` | All 28 v28 canonical slash commands exercised with real engine output + log. |
| `full-flow-demo/` | 9-phase workflow E2E: change → requirement → design → ui-design → task → dev → test → review → integration. All 11 artifacts generated. |
| `commands-smoke/` | CLI command manifest + smoke fixtures for all `taiyi-forge.sh` subcommands. |
| `test/` | Auto-plan pipeline integration test with manifest-driven code generation. |

### 🔧 Services

- **`services/translation_api/`** — Production-grade backend service: FastAPI + Strategy pattern (6 translation directions) + Adapter pattern (OpenAI LLM) + SSE streaming + structured logging + 3 health endpoints + middleware chain. 21 pytest tests.

### 🧩 Tests (Engine)

- **151 test files · 1,170 tests · 0 failures**
- New: `wiring-detector`, `wiring-generator`, `wiring-integration`, `wave-allocator`, `arch-templates`, `arch-guide-fanout`, `code-gen`, `llm-plan`, `phase-context`, `executor`, `human-gate-config`
- All 8 profiles exercised end-to-end (full / api / ui / lite / spike / micro / nano / audit)
- 29 Agent roles protocol coverage
- CLI commands: 70 subcommand smoke tests via `cli-commands.test.ts`
- Post-install smoke: verifies 4-platform skill installation (Claude / Codex / Cursor / OpenCode)
- Browser E2E: Playwright integration + `/taiyi:e2e` contract

### ⚙️ CI / CD

- **Release Workflow** (`.github/workflows/release.yml`) — Automatic npm publish + git tag on release.
- **Translation Assistant CI** (`.github/workflows/translation-assistant-ci.yml`) — Backend pytest + frontend lint on push.

### 📖 Docs

- Architecture diagrams updated (EN + ZH 4K resolution)
- `canonical-commands.md` v28: 28 slash commands fully documented with engine/chat layering
- Diagram pipeline documentation (`diagram-pipeline.generated.md`)
- `CONTRIBUTING.md` guidelines
- `QUICKSTART.md` 5-minute onboarding

### 📊 Statistics

| Metric | Value |
|--------|-------|
| Files changed | 609 |
| Lines added | 28,679 |
| Lines deleted | 987 |
| New source files (src/) | 13 |
| New test files | 19 |
| New example projects | 6 |
| Test files total | 151 |
| Tests passing | 1,170 |
| Python tests (examples) | 83 |
| CLI smoke commands | 70 |
| Agent roles tested | 29 |
| Profiles tested | 8 |

---

## [1.0.0] — 2026-06-28 · 首个正式版

**609 个文件变更 · +28,679 / -987 行**

> 此版本将 TaiyiForge 从 30+ 个预发布迭代（v0.1–v0.42 + rc.1）**升级为稳定的 1.x 正式版**。每条斜杠命令、每个阶段门控、每种工作流模式、每个示例都经过了端到端验证。

### 🏗️ 引擎核心

- **`/taiyi:plan` 自动规划流水线** — 输入 README / PRD / PDF / URL，引擎自动拆解为独立 change 模块，推荐 profile 与依赖顺序。Auto 模式（`--auto`）一键生成全栈骨架（后端、前端、测试、迁移）。
- **代码生成引擎** (`src/core/code-gen.ts`) — 模板驱动的代码生成，含自动布线检测。从 manifest 生成 FastAPI 路由、中间件链、策略模式、适配器接口与测试。
- **布线检测器 + 生成器** — 自动注册 FastAPI 路由、中间件排序、生成项目树中的 `__init__.py` 布线文件。
- **架构模板** (`src/core/arch-templates.ts`) — 20+ 内置架构参考模板，覆盖分层架构、微服务、事件驱动、CQRS、六边形端口适配器。
- **计划审计** (`src/core/plan-audit.ts`) — 执行前对 TASK.md 计划进行自动质量审查，阻塞结构性问题。
- **Wave 分配器** (`src/core/wave-allocator.ts`) — 多 change 工作流的并行执行 wave 规划，尊重 change 间依赖。
- **评审架构检查** (`src/core/review-arch-check.ts`) — review 阶段对代码进行架构约束静态分析。
- **阶段上下文** — 改进 `PHASE-CONTEXT.md` 生成，~500 token 摘要，无需全量读取上游工件。
- **Profile 系统** — 8 种 profile（full、api、ui、lite、spike、micro、nano、audit），正确的阶段跳过、辅助 Skill 路由与复杂度推荐。
- **人类门控配置** — 按阶段可精细控制自动审批行为。

### 🧪 示例与验证（8 套）

| 示例 | 验证内容 |
|------|----------|
| `translation-assistant/` | 完整 LLM 翻译 API：6 方向策略、FastAPI + SSE 流式输出、Docker/nginx 部署。两个变体：`agent/`（AI 生成）+ `llm/`（LLM 生成）。83 个 pytest 测试。 |
| `todo-fullstack/` | 全栈 Todo 应用（Express CRUD API + 原生 JS 前端 + E2E）。10 个测试通过。 |
| `browser-e2e-smoke/` | Playwright 浏览器 E2E smoke 测试框架，对齐 `/taiyi:e2e`。 |
| `verification-suite/` | L0–L4 分层验证：`run-all.mjs` 一条命令覆盖 151 个测试文件、1170+ 个测试。 |
| `v28-all-slashes-demo/` | 28 条 v28 规范斜杠命令全部执行，含真实引擎输出与日志。 |
| `full-flow-demo/` | 九阶段工作流 E2E：change → requirement → design → ui-design → task → dev → test → review → integration。全部 11 件工件落地。 |
| `commands-smoke/` | CLI 命令 manifest + 所有 `taiyi-forge.sh` 子命令的 smoke 夹具。 |
| `test/` | 自动规划流水线集成测试，含 manifest 驱动的代码生成。 |

### 🔧 服务

- **`services/translation_api/`** — 生产级后端服务：FastAPI + 策略模式（6 个翻译方向）+ 适配器模式（OpenAI LLM）+ SSE 流式输出 + 结构化日志 + 3 个健康检查端点 + 中间件链。21 个 pytest 测试。

### 🧩 测试（引擎）

- **151 个测试文件 · 1,170 个测试 · 0 失败**
- 新增：`wiring-detector`、`wiring-generator`、`wiring-integration`、`wave-allocator`、`arch-templates`、`arch-guide-fanout`、`code-gen`、`llm-plan`、`phase-context`、`executor`、`human-gate-config`
- 8 种 profile 端到端验证（full / api / ui / lite / spike / micro / nano / audit）
- 29 个 Agent 角色协议覆盖
- CLI 命令：70 个子命令 smoke 测试（`cli-commands.test.ts`）
- 安装后 smoke：验证四端 Skill 安装（Claude / Codex / Cursor / OpenCode）
- 浏览器 E2E：Playwright 集成 + `/taiyi:e2e` 契约

### ⚙️ CI / CD

- **发布工作流** (`.github/workflows/release.yml`) — 发布时自动 npm publish + git tag。
- **翻译助手 CI** (`.github/workflows/translation-assistant-ci.yml`) — push 时自动运行后端 pytest + 前端 lint。

### 📖 文档

- 架构图更新（中英文 4K 分辨率）
- `canonical-commands.md` v28：28 条斜杠命令完整文档，含引擎/聊天分层
- 图表流水线文档 (`diagram-pipeline.generated.md`)
- `CONTRIBUTING.md` 贡献指南
- `QUICKSTART.md` 5 分钟上手

### 📊 统计数据

| 指标 | 数值 |
|------|------|
| 文件变更 | 609 |
| 新增代码行 | 28,679 |
| 删除代码行 | 987 |
| 新增源文件 (src/) | 13 |
| 新增测试文件 | 19 |
| 新增示例项目 | 6 |
| 测试文件总数 | 151 |
| 测试通过数 | 1,170 |
| Python 测试数 (examples) | 83 |
| CLI smoke 命令数 | 70 |
| Agent 角色测试数 | 29 |
| Profile 测试数 | 8 |

---

<!-- taiyi:agent-mode-translation-api-backend-core --> 2026-06-27
# CHANGELOG: agent-mode-translation-api-backend-core

## Added

- `services/translation_api/`: Full backend translation API with Adapter + Strategy architecture
- 6 translation direction strategies (dev↔product, dev↔ops, product↔ops)
- OpenAI LLM adapter with streaming support
- SSE streaming endpoint (`POST /api/translation/translate/stream`)
- 3 health endpoints (GET /health, /ready, /live)
- Middleware chain: request logging, error handling, response time
- Pydantic v2 request/response schemas with role validation
- 21 pytest tests covering config, strategies, services, middleware, controllers

## Changed

- (none)

## Fixed

- (none)

## Success Criteria Met

- [x] All 21 tests pass (config 3, strategies 5, services 6, middleware 1, controllers 6)
- [x] POST /api/translation/translate returns 200 with translated text
- [x] POST /api/translation/translate/stream returns SSE with content-type text/event-stream
- [x] 6 translation directions routable via TranslationService factory
- [x] 3 health endpoints return HTTP 200 with `{"status": "ok"}`
- [x] Middleware chain operational (logging, error handling, X-Response-Time)

## Rollback

```
git revert HEAD --no-edit
```

<!-- taiyi:frontend-ui --> 2026-06-24
# CHANGELOG: frontend-ui

## Added

- examples/translation-assistant/index.html: Single-file frontend with responsive layout
- Source text input with Enter-to-translate + Shift+Enter for newline
- Role selection dropdown (product→dev, dev→product, ops→dev)
- SSE streaming display via fetch reader (fallback to POST/JSON)
- Loading bar animation + error banner
- Mobile-responsive CSS (flexbox, media queries)

## Changed

- (none)

## Fixed

- (none)

## Docs

- [x] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-

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
