# Changelog

> 📦 较早的变更已归档至 [CHANGELOG-ARCHIVE.md](CHANGELOG-ARCHIVE.md)。

---

## [1.0.0] — 2026-06-28 · First Stable Release / 首个正式版

**609 files / 个文件 · +28,679 / -987 lines / 行**

> This release graduates TaiyiForge from 30+ pre-release iterations (v0.1–v0.42 + rc.1) into a **stable, production-ready 1.x line**.
> 此版本将 TaiyiForge 从 30+ 个预发布迭代（v0.1–v0.42 + rc.1）**升级为稳定的 1.x 正式版**。

### 🏗️ Engine Core / 引擎核心

| EN | ZH |
|----|-----|
| **`/taiyi:plan` Auto-Plan Pipeline** — Input README / PRD / PDF / URL, engine decomposes into independent changes with profile + dependency ordering. Auto mode (`--auto`) generates full-stack scaffolding (backend, frontend, tests, migrations). | **`/taiyi:plan` 自动规划流水线** — 输入 README / PRD / PDF / URL，引擎自动拆解为独立 change 模块，推荐 profile 与依赖。Auto 模式一键生成全栈骨架。 |
| **Code Generation Engine** (`code-gen.ts`) — Template-driven code gen with wiring auto-detection. Generates FastAPI routers, middleware chains, strategy patterns, adapter interfaces, and tests from manifest. | **代码生成引擎** — 模板驱动，自动检测布线。从 manifest 生成 FastAPI 路由、中间件链、策略模式、适配器接口与测试。 |
| **Wiring Detector + Generator** — Automatic FastAPI router registration, middleware ordering, and `__init__.py` wiring across generated project tree. | **布线检测器 + 生成器** — 自动注册 FastAPI 路由、中间件排序、生成 `__init__.py` 布线文件。 |
| **Architecture Templates** (`arch-templates.ts`) — 20+ built-in templates: layered, microservices, event-driven, CQRS, hexagonal ports & adapters. | **架构模板** — 20+ 内置模板：分层、微服务、事件驱动、CQRS、六边形端口适配器。 |
| **Plan Audit** (`plan-audit.ts`) — Automated quality review of TASK.md before execution, blocks on structural issues. | **计划审计** — 执行前自动审查 TASK.md 质量，阻塞结构性问题。 |
| **Wave Allocator** (`wave-allocator.ts`) — Parallel execution wave planning for multi-change workflows. | **Wave 分配器** — 多 change 工作流的并行执行 wave 规划。 |
| **Review Architecture Check** (`review-arch-check.ts`) — Static analysis against architecture constraints during review phase. | **评审架构检查** — review 阶段静态分析代码是否符合架构约束。 |
| **Phase Context** — Improved `PHASE-CONTEXT.md` generation with ~500 token summaries. | **阶段上下文** — 改进 PHASE-CONTEXT.md，~500 token 摘要。 |
| **Profile System** — 8 profiles (full / api / ui / lite / spike / micro / nano / audit) with correct phase skipping, auxiliary skill routing, complexity recommendations. | **Profile 系统** — 8 种 profile，正确的阶段跳过、辅助 Skill 路由、复杂度推荐。 |
| **Human Gate Configuration** — Fine-grained auto-human approval control per phase via config. | **人类门控配置** — 按阶段可精细控制自动审批行为。 |

### 🧪 Examples & Verification / 示例与验证

| Example / 示例 | EN / 中文 |
|---------|-----------|
| `translation-assistant/` | Full-featured LLM translation API: 6-direction strategies, FastAPI + SSE streaming, Docker/nginx. Two variants (`agent/` + `llm/`). 83 pytest tests. / 完整 LLM 翻译 API：6 方向策略、FastAPI + SSE 流式、Docker/nginx。两个变体。83 个 pytest 测试。 |
| `todo-fullstack/` | Fullstack Todo app (Express CRUD + vanilla JS frontend + E2E). 10 tests. / 全栈 Todo 应用（Express CRUD + 原生 JS 前端 + E2E）。10 个测试。 |
| `browser-e2e-smoke/` | Playwright browser E2E smoke framework, aligned with `/taiyi:e2e`. / Playwright 浏览器 E2E smoke 框架，对齐 `/taiyi:e2e`。 |
| `verification-suite/` | L0–L4 layered verification: 151 test files, 1,170+ tests in one `run-all.mjs` command. / L0–L4 分层验证：一条 `run-all.mjs` 覆盖 151 文件、1170+ 测试。 |
| `v28-all-slashes-demo/` | All 28 v28 canonical slash commands exercised with real engine output. / 28 条 v28 规范斜杠全量执行，含真实引擎输出。 |
| `full-flow-demo/` | 9-phase E2E: change → requirement → design → ui-design → task → dev → test → review → integration. All 11 artifacts. / 九阶段端到端：全部 11 件工件落地。 |
| `commands-smoke/` | CLI manifest + smoke fixtures for all `taiyi-forge.sh` subcommands. / CLI manifest + 所有 `taiyi-forge.sh` 子命令 smoke 夹具。 |
| `test/` | Auto-plan pipeline integration test with manifest-driven code generation. / 自动规划流水线集成测试，含 manifest 驱动代码生成。 |

### 🔧 Services / 服务

| EN | ZH |
|----|-----|
| **`services/translation_api/`** — Production-grade backend: FastAPI + Strategy pattern (6 directions) + Adapter pattern (OpenAI) + SSE streaming + structured logging + 3 health endpoints + middleware chain. 21 pytest tests. | **`services/translation_api/`** — 生产级后端：FastAPI + 策略模式（6 方向）+ 适配器模式（OpenAI）+ SSE 流式 + 结构化日志 + 3 健康检查 + 中间件链。21 个 pytest 测试。 |

### 🧩 Tests / 测试

| EN | ZH |
|----|-----|
| **151 test files · 1,170 tests · 0 failures** | **151 个测试文件 · 1,170 个测试 · 0 失败** |
| New modules: `wiring-detector`, `wiring-generator`, `wiring-integration`, `wave-allocator`, `arch-templates`, `arch-guide-fanout`, `code-gen`, `llm-plan`, `phase-context`, `executor`, `human-gate-config` | 新增模块：`wiring-detector`、`wiring-generator`、`wiring-integration`、`wave-allocator`、`arch-templates`、`arch-guide-fanout`、`code-gen`、`llm-plan`、`phase-context`、`executor`、`human-gate-config` |
| 8 profiles exercised end-to-end (full / api / ui / lite / spike / micro / nano / audit) | 8 种 profile 端到端覆盖 |
| 29 Agent roles protocol coverage | 29 个 Agent 角色协议覆盖 |
| 70 CLI subcommand smoke tests | 70 个 CLI 子命令 smoke 测试 |
| Post-install smoke: 4-platform skill installation verified (Claude / Codex / Cursor / OpenCode) | 安装后 smoke：四端 Skill 验证 |
| Browser E2E: Playwright + `/taiyi:e2e` contract | 浏览器 E2E：Playwright + `/taiyi:e2e` 契约 |

### ⚙️ CI / CD

| EN | ZH |
|----|-----|
| **Release Workflow** — Auto npm publish + git tag on release. | **发布工作流** — 发布时自动 npm publish + git tag。 |
| **Translation Assistant CI** — Backend pytest + frontend lint on push. | **翻译助手 CI** — push 时自动后端 pytest + 前端 lint。 |

### 📖 Docs / 文档

- Architecture diagrams updated (EN + ZH, 4K) / 架构图更新（中英文 4K）
- `canonical-commands.md` v28: 28 slash commands with engine/chat layering / 28 条斜杠命令完整文档
- Diagram pipeline docs (`diagram-pipeline.generated.md`) / 图表流水线文档
- `CONTRIBUTING.md` / 贡献指南
- `QUICKSTART.md` 5-minute onboarding / 5 分钟上手

### 📊 Statistics / 统计数据

| Metric / 指标 | Value / 数值 |
|--------|-------|
| Files changed / 文件变更 | 609 |
| Lines added / 新增行 | 28,679 |
| Lines deleted / 删除行 | 987 |
| New source files (src/) / 新增源文件 | 13 |
| New test files / 新增测试文件 | 19 |
| New example projects / 新增示例项目 | 6 |
| Test files total / 测试文件总数 | 151 |
| Tests passing / 测试通过 | 1,170 |
| Python tests (examples) / Python 测试 | 83 |
| CLI smoke commands / CLI smoke 命令 | 70 |
| Agent roles tested / Agent 角色测试 | 29 |
| Profiles tested / Profile 测试 | 8 |

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
