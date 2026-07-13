# DESIGN: API 规范化（≥2 方案对比）

## 方案 A：URL Path 版本化 + FastAPI 原生 OpenAPI

**技术选型**: /api/v1/* 路径前缀 + FastAPI 自动生成 OpenAPI schema

**架构**:
```
app/controllers/v1/ → 版本化的路由
FastAPI(title, version, docs_url="/docs") → OpenAPI
pydantic-settings + watchfiles → 热加载
```

**优点**: 零额外依赖，FastAPI 原生支持，URL 版本化直观
**缺点**: 多版本共存时代码量翻倍

## 方案 B：Header 版本化 + 自定义 OpenAPI 生成

**技术选型**: Accept-Version header + 手动 OpenAPI 构建

**优点**: URL 保持干净
**缺点**: 调试不直观（curl 需加 header），文档工具支持差

## 决策

选 **方案 A**。理由：
1. URL 版本化是最广泛使用的 REST API 版本策略
2. FastAPI 原生 OpenAPI 生成，零额外维护成本
3. Swagger UI 自动可用，开发者体验好
