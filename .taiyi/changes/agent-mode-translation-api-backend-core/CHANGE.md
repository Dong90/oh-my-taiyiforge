# CHANGE: Agent mode: Translation API backend core

## Motivation

当前沟通翻译助手项目 README 定义了完整的 API 端点设计，但实际代码尚未实现。团队成员（产品经理/开发工程师/运营）之间需要实时翻译沟通，当前每次人工翻译耗时约 10 分钟。通过 API + LLM 翻译可将翻译时间压缩至 5 秒以内。

**Agent 模式差异**：与 template 模式不同，本 change 由 AI agent 基于 manifest 规格文件逐模块生成真实代码，而非模板骨架。每个模块遵循 manifest 中声明的 pattern（Adapter/Strategy/Service/Controller/Middleware），含完整方法体、异常处理、日志。

## Scope

### In Scope
- **适配器层**：`LLMAdapter` 抽象基类 + `OpenAIAdapter` 实现（M1, M2）
- **策略层**：`TranslationStrategy` 基类 + 6 方向策略实现（M3-M9）
  - product→dev, dev→product, dev→ops, ops→dev, product→ops, ops→product
- **服务层**：`TranslationService`（工厂分发）+ `LLMService`（调用封装）（M10, M11）
- **控制器层**：`TranslationController`（SSE 流式 + 非流式）（M12）
- **中间件**：请求日志、错误处理、响应时间统计（M13-M15）
- **配置管理**：pydantic-settings（M16）
- **应用入口**：FastAPI app factory（M17）
- **测试**：pytest 单元测试 + 集成测试

### Out of Scope
- 前端 UI（独立 change `frontend-ui`）
- 安全认证/JWT（独立 change `security`）
- 数据持久化/SQLAlchemy（独立 change `persistence`）
- Docker 部署（独立 change `docker-deploy`）
- 多 LLM 适配器（独立 change `more-llm-adapters`）

## Risks

- OpenAI API key 依赖环境变量，首次运行需确保 `OPENAI_API_KEY` 可访问
- SSE 流式翻译在代理环境下可能被缓冲
- 6 策略子类通过工厂分发，新增方向需同时注册

## Success Criteria

- [x] `POST /api/translation/translate` 返回 200 + 正确翻译结果
- [x] `POST /api/translation/translate/stream` 返回 SSE `text/event-stream`
- [x] 6 个翻译方向均可路由到对应策略
- [x] 适配器 + 策略 + 服务三层解耦
- [x] 中间件链完整：日志 → 错误处理 → 响应时间
- [x] `pytest tests/ -v` 全部通过
- [x] 3 个健康端点（/health, /ready, /live）返回 200
