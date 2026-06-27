# ADR: URL Path 版本化 (/api/v1/*) + FastAPI 原生 OpenAPI

## 状态: 已提议

## 决策
采用 URL Path 版本化（/api/v1/*）+ FastAPI 自动生成的 OpenAPI schema。

## 理由
- URL 版本化是 REST API 最广泛使用的策略
- FastAPI 原生 OpenAPI 生成，零额外维护
- Swagger UI / ReDoc 自动可用
- pydantic-settings 支持 watchfiles 热加载
