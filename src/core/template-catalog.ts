/** Template catalog — provides Agent with available patterns for manifest generation. */
export const TEMPLATE_CATALOG = `# TaiyiForge Template Catalog (供 Agent 生成 manifest 时参考)

## Available Patterns & Typical Files

| Pattern | 典型文件 | 说明 |
|---------|---------|------|
| Adapter | adapters/{name}.py | 抽象基类+具体实现，含错误处理和依赖注入 |
| Strategy | strategies/{name}.py | 策略模式实现，可选 prompt_style:"advanced"(XML+CoT) |
| Service | services/{name}.py | 业务逻辑层，DI+工厂+校验 |
| Controller | controllers/{name}.py | FastAPI路由，DI链+metrics+SSE |
| Middleware | middleware/{name}.py | 请求中间件（日志/响应时间/错误处理） |
| ResponseTimeMiddleware | middleware/{name}.py | 响应时间追踪middleware |
| ErrorHandlerMiddleware | middleware/{name}.py | 全局错误捕获middleware |
| Model | models/{name}.py | Pydantic请求/响应模型 |
| Config | config/settings.py | pydantic-settings，含log_level/app_name/CORS |
| Health | controllers/{name}.py | /health /ready /live 健康检查端点 |
| Main | main.py | FastAPI入口，CORS+middleware+router注册 |
| Metrics | services/metrics_service.py | 单例指标服务，线程安全计数器 |
| ExceptionHandler | core/exception_handler.py | 全局异常处理器，注册到FastAPI app |

## 基础设施模块（每个项目应包含）

| 文件 | Pattern | class_name | 说明 |
|------|---------|-----------|------|
| config/settings.py | Config | Settings | pydantic-settings |
| core/exceptions.py | ExceptionHandler | exception_classes | 自定义异常体系 |
| core/exception_handler.py | ExceptionHandler | setup_exception_handlers | 全局异常注册 |
| core/logger.py | ExceptionHandler | logger_module | JSON结构化日志 |
| middleware/logging.py | Middleware | LoggingMiddleware | 请求日志middleware |
| middleware/response_time.py | ResponseTimeMiddleware | ResponseTimeMiddleware | 响应时间 |
| middleware/error_handler.py | ErrorHandlerMiddleware | ErrorHandlerMiddleware | 错误捕获 |
| controllers/health_controller.py | Health | health_router | 健康检查 |
| controllers/metrics_controller.py | Controller | metrics_router | 指标端点 |
| services/metrics_service.py | Metrics | MetricsService | 指标收集 |
| main.py | Main | app | FastAPI app入口 |
| tests/conftest.py | (scaffold) | - | pytest fixtures |
`;

/** Get template catalog as text for Agent consumption. */
export function getTemplateCatalog(): string {
  return TEMPLATE_CATALOG;
}
