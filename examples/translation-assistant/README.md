# 沟通翻译助手

一个帮助产品经理、开发工程师和运营更好地理解彼此的AI翻译工具。

## 项目架构

本项目采用**分层架构**和**设计模式**，确保代码的可维护性和可扩展性。

### 架构设计

```
┌─────────────────────────────────────┐
│         Frontend (HTML/JS)          │
└──────────────┬──────────────────────┘
               │ HTTP/SSE
┌──────────────▼──────────────────────┐
│      FastAPI (Controllers)           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Services (业务逻辑层)            │
│  - TranslationService                │
│  - LLMService                       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Strategies (策略模式)              │
│  - ProductToDevStrategy             │
│  - DevToProductStrategy             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Adapters (适配器模式)              │
│  - OpenAIAdapter                    │
│  - (可扩展: ClaudeAdapter等)        │
└─────────────────────────────────────┘
```

### 设计模式

#### 策略模式 (Strategy Pattern)

- `TranslationStrategy` 抽象基类
- 6个策略实现类，覆盖所有翻译方向：
  - `ProductToDevStrategy` — 产品→开发
  - `DevToProductStrategy` — 开发→产品
  - `DevToOpsStrategy` — 开发→运营
  - `OpsToDevStrategy` — 运营→开发
  - `ProductToOpsStrategy` — 产品→运营
  - `OpsToProductStrategy` — 运营→产品
- 便于扩展新的翻译策略

#### 适配器模式 (Adapter Pattern)

- `LLMAdapter` 抽象基类
- `OpenAIAdapter` 适配 OpenAI API
- 可以轻松切换不同的大模型提供商

#### 依赖注入 (Dependency Injection)

- 服务层通过构造函数注入依赖
- 便于测试和切换实现

#### 工厂模式 (Factory Pattern)

- `TranslationService._get_strategy()` 根据方向创建策略实例

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置说明

项目使用 `pydantic-settings` 统一管理配置，配置文件位于 `backend/app/config/settings.py`。

**配置方式（按优先级从高到低）：**

1. 环境变量（如 `OPENAI_API_KEY`）
2. `.env` 文件（在项目根目录）
3. `settings.py` 中的默认值

**重要配置项：**

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenAI API密钥（必需） | — |
| `OPENAI_API_BASE_URL` | API基础URL（可选） | `https://s.lconai.com/v1` |
| `OPENAI_MODEL` | 使用的模型 | `gpt-4` |

> **注意**：如果环境变量中的API密钥是测试key（如 `test-key-*`），系统会自动忽略并使用 `settings.py` 中的默认值。

### 3. 运行后端

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 4. 打开前端

直接用浏览器打开 `frontend/index.html`，或使用简单的HTTP服务器：

```bash
cd frontend
python -m http.server 8080
```

然后访问 http://localhost:8080

## 功能说明

### 核心功能

**支持的翻译方向（6个）：**

| 方向 | 说明 | 输出维度 |
|------|------|----------|
| 产品经理 → 开发工程师 (`product_to_dev`) | 将产品需求转化为技术实现方案 | 技术栈建议、数据来源、性能要求、工作量评估 |
| 开发工程师 → 产品经理 (`dev_to_product`) | 将技术方案转化为业务价值描述 | 用户体验影响、业务增长空间、商业价值 |
| 开发工程师 → 运营 (`dev_to_ops`) | 将技术方案转化为业务价值和决策依据 | 业务价值与ROI、运营指标与KPI、资源需求与风险 |
| 运营 → 开发工程师 (`ops_to_dev`) | 将业务需求转化为技术实现方案 | 技术实现方案、性能与容量规划、运营支撑功能 |
| 产品经理 → 运营 (`product_to_ops`) | 将产品需求转化为业务价值和运营策略 | 业务价值与市场机会、运营指标与KPI影响、运营策略与执行 |
| 运营 → 产品经理 (`ops_to_product`) | 将业务需求转化为产品功能需求 | 产品功能需求、用户体验设计、数据与指标 |

### 其他功能

- **流式输出**：实时显示AI生成过程，提升用户体验

## API端点

### 翻译接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/translation/translate` | 非流式翻译 |
| POST | `/api/translation/translate/stream` | 流式翻译（SSE） |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查（服务是否运行） |
| GET | `/ready` | 就绪检查（服务是否就绪，包括依赖检查） |
| GET | `/live` | 存活检查（服务是否存活） |

### 指标接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/metrics` | 获取产品指标（翻译统计、性能指标等） |

## 测试用例

### 测试用例1：产品视角输入

**输入：**

> 我们需要一个智能推荐功能，提升用户停留时长

**预期输出（开发视角）：**

- 推荐算法类型建议（协同过滤/内容推荐等）
- 数据来源和处理方式
- 性能和实时性要求
- 预估开发工作量

### 测试用例2：开发视角输入

**输入：**

> 我们优化了数据库查询，QPS提升了30%

**预期输出（产品视角）：**

- 对用户体验的实际影响（加载速度提升）
- 支持的业务增长空间（能承载更多用户）
- 成本降低的商业价值

## 提示词设计说明

### 设计思路

1. **角色定位明确**
   - 产品→开发：AI扮演"开发工程师"，关注技术实现
   - 开发→产品：AI扮演"产品经理"，关注业务价值

2. **输出结构清晰**
   - 使用明确的要点列表
   - 每个方向都有固定的关注维度

3. **补充缺失信息**
   - 产品说需求时，自动提示技术关注点
   - 开发说技术时，自动补充业务价值

### 关键设计点

- **系统提示词 (System Prompt)**：定义AI的角色和翻译规则
- **用户提示词格式化**：将用户输入包装成完整的提示
- **多轮对话支持**：可以基于上下文进行更深入的翻译

## 运行测试

```bash
cd backend
pytest tests/ -v
```

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.8+, FastAPI, OpenAI API |
| 前端 | HTML5, CSS3, JavaScript (原生) |
| 测试 | pytest, pytest-asyncio |
| 架构 | 分层架构 + 设计模式 |

## 架构设计评估

### ✅ 已实现的设计模式

- **策略模式 (Strategy Pattern)** — 翻译策略可扩展（6个策略实现）
- **适配器模式 (Adapter Pattern)** — 大模型适配器可切换（OpenAI适配器）
- **依赖注入 (Dependency Injection)** — 服务层解耦（FastAPI Depends）
- **工厂模式 (Factory Pattern)** — 策略实例创建（TranslationService）
- **分层架构 (Layered Architecture)** — 清晰的职责分离
- **中间件模式 (Middleware Pattern)** — 请求处理管道（日志、错误处理、响应时间）

### ⚠️ 需要补充的架构要素（达到资深架构师级别）

#### 1. 配置管理 (Configuration Management)
- [x] 使用 pydantic-settings 统一管理配置
- [x] 环境变量验证和类型转换
- [ ] 配置热加载支持

#### 2. 日志系统 (Logging System)
- [x] 结构化日志（JSON格式）
- [x] 日志级别管理（DEBUG/INFO/WARNING/ERROR）
- [x] 请求追踪ID（Request ID，使用 contextvars 实现异步上下文隔离）
- [ ] 日志聚合和查询

#### 3. 异常处理 (Exception Handling)
- [x] 统一异常处理中间件
- [x] 自定义业务异常类
- [x] 异常分类和错误码体系
- [ ] 异常监控和告警

#### 4. 监控和可观测性 (Observability)
- [x] 健康检查端点（/health, /ready, /live）
- [x] 基础指标收集（翻译统计、性能指标）
- [ ] 指标收集（Prometheus metrics）
- [ ] 分布式追踪（OpenTelemetry）
- [ ] APM性能监控

#### 5. 安全机制 (Security)
- [ ] API认证和授权（JWT/OAuth2）
- [ ] 请求限流（Rate Limiting）
- [ ] 输入验证和清理
- [ ] CORS配置优化
- [ ] API密钥管理

#### 6. 性能优化 (Performance)
- [ ] 响应缓存（Redis）
- [ ] 连接池管理
- [ ] 异步任务队列（Celery/RQ）
- [ ] 数据库连接池（如需要）

#### 7. 数据持久化 (Persistence)
- [ ] 数据库抽象层（Repository Pattern）
- [ ] ORM集成（SQLAlchemy/Tortoise ORM）
- [ ] 迁移管理（Alembic）
- [ ] 数据模型设计

#### 8. 中间件系统 (Middleware)
- [x] 请求日志中间件
- [x] 错误处理中间件
- [x] 响应时间统计中间件
- [ ] 认证中间件
- [ ] 限流中间件

#### 9. API设计 (API Design)
- [ ] API版本管理（/api/v1/...）
- [ ] OpenAPI/Swagger文档完善
- [ ] 请求/响应模型验证
- [ ] API限流策略

#### 10. 部署和运维 (DevOps)
- [ ] Docker容器化
- [ ] Docker Compose本地开发环境
- [ ] CI/CD流水线配置
- [ ] 环境隔离（dev/staging/prod）
- [ ] 健康检查和优雅关闭

#### 11. 测试策略 (Testing Strategy)
- [x] 单元测试
- [ ] 集成测试
- [ ] E2E测试
- [ ] 性能测试
- [ ] 测试覆盖率报告

#### 12. 文档完善 (Documentation)
- [ ] API文档（Swagger/ReDoc）
- [ ] 架构决策记录（ADR）
- [ ] 部署文档
- [ ] 开发指南
- [ ] 故障排查手册

## 扩展方向

### 功能扩展

**支持更多大模型**
- 实现 ClaudeAdapter
- 实现国内大模型适配器（通义千问、文心一言等）

**支持更多角色**
- 运营 → 产品
- 管理层 → 技术团队

**上下文记忆**
- 保存对话历史
- 支持多轮对话

**用户认证**
- 登录系统
- 使用记录

### 架构升级路径

**微服务化**
- 服务拆分（翻译服务、用户服务、历史服务）
- 服务注册与发现
- API网关

**高可用设计**
- 负载均衡
- 服务降级和熔断
- 多活部署

**数据层优化**
- 读写分离
- 缓存策略
- 数据分片

## 项目结构

```
translation-assistant/
├── backend/
│   ├── app/
│   │   ├── adapters/          # 适配器层（OpenAI适配器）
│   │   ├── strategies/        # 策略层（6个翻译策略）
│   │   ├── services/          # 服务层（翻译服务、LLM服务、指标服务）
│   │   ├── controllers/       # 控制器层（翻译、健康检查、指标）
│   │   ├── models/            # 数据模型（请求、响应、指标）
│   │   ├── middleware/        # 中间件（日志、错误处理、响应时间）
│   │   ├── config/            # 配置管理（settings.py）
│   │   ├── core/              # 核心功能（日志、异常处理）
│   │   └── main.py            # 应用入口
│   ├── tests/                 # 测试代码
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── index.html             # 主页面
│   ├── style.css              # 样式文件
│   ├── app.js                 # 前端逻辑
│   └── metrics.js             # 指标展示
├── QUICK_START.md             # 快速开始指南
└── README.md                  # 项目说明
```

## 部署说明

### 本地开发

```bash
# 1. 克隆项目
git clone <repository-url>
cd translation-assistant

# 2. 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 安装依赖
cd backend
pip install -r requirements.txt

# 4. 配置环境变量（可选，也可在 settings.py 中配置）
export OPENAI_API_KEY="your-api-key"

# 5. 运行服务
cd backend
uvicorn app.main:app --reload --port 8000
```

### Docker部署（待实现）

```bash
# 构建镜像
docker build -t translation-assistant:latest .

# 运行容器
docker run -p 8000:8000 -e OPENAI_API_KEY=xxx translation-assistant:latest
```

### 生产环境建议

| 领域 | 推荐方案 |
|------|----------|
| 进程管理器 | systemd, supervisor, 或 PM2 |
| 反向代理 | Nginx 或 Traefik |
| 监控告警 | Prometheus + Grafana |
| 日志收集 | ELK Stack 或 Loki |
| 容器编排 | Kubernetes（大规模部署） |

## 性能指标

### 目标指标（待实现监控）

| 指标 | 目标 |
|------|------|
| 响应时间 | P95 < 3s |
| 吞吐量 | > 100 req/s |
| 可用性 | 99.9% |
| 错误率 | < 0.1% |

## 安全考虑

### 已实现

- [x] CORS配置（支持跨域请求）
- [x] 输入验证（Pydantic模型验证）
- [x] 配置统一管理（settings.py，防止测试key泄露）
- [x] 结构化日志（JSON格式，便于日志分析）
- [x] 请求追踪（request_id，支持异步上下文隔离）
- [x] 统一异常处理（自定义异常类和错误码体系）

### 待实现

- [ ] API认证（JWT/OAuth2）
- [ ] 请求限流
- [ ] API密钥加密存储
- [ ] 敏感信息脱敏
- [ ] 安全审计日志

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request
