
## Archived at 2026-07-05

<!-- taiyi:translation-assistant-tests --> 2026-07-04
# CHANGELOG: 翻译助手测试覆盖增强

## Added

- tests/integration/ — 集成测试（翻译 API 完整调用链）
- tests/e2e/ — E2E 测试目录
- tests/performance/ — 性能测试目录
- .coveragerc — pytest-cov 覆盖率配置（80% 门禁）

## Changed

- 无

## Fixed

- 无

## Docs

- [x] 测试目录结构完备

## Archived at 2026-07-14

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

- **模板移除所有占位符**：8 个 `.hbs` 模板的 `{{else}}` 分支中删除 `请填写 xxx`、`待补充`、`[可用性指标]`、`[流程名]`
  等占位符文本。`[MEDIUM+]` 段数据缺失时整段不渲染而非显示空表
- **seed 复杂度感知**：`buildSeedJson` 根据 `complexity.score` 分级生成 seed 数据。`[MEDIUM+]`
  字段仅在 score≥8 时生成，`[HIGH]` 在 score≥15 时生成
- **Quality Gate 条件化**：8 个模板的 Gate 检查项与对应的数据字段联动。数据不存在时 Gate 项也不出现
- **autoFill 复杂度打通**：`forceRenderPhaseFromJson` 从 `state.json` 读取复杂度 → `autoFillJson` →
  `buildSeedJson`，确保复杂度升级后 re-render 自动补全缺失字段

## Fixed

- seed 数据中 `待填写`/`待估`/`待评审`/`未指定` 全部清除为空，不再通过 autoFill 注入用户工件
- 低复杂度变更不再渲染空表或占位符文本的 `[MEDIUM+]` 段

<!-- taiyi:docker-compose-ci-cd --> 2026-07-04
# CHANGELOG: Docker 容器化 + Compose + CI/CD + 环境隔离

## Added

- `Dockerfile` — Python 3.11-slim 镜像，FastAPI + uvicorn，健康检查
- `docker-compose.yml` — 一键启动 backend (8000) + frontend Nginx (8080)
- `nginx.conf` — 前端反向代理，SSE 流式支持
- `.github/workflows/translation-assistant-ci.yml` — lint + pytest + docker build
- `.env.example` — 环境变量模板（TAIYI_ENV 区分 dev/staging/prod）

## Changed

- （无业务代码改动）

## Fixed

- （无）

## Docs

- [x] 部署文件完备
- [ ] README / AGENTS.md synced
- [ ] OpenSpec archived

## Rollback

-
