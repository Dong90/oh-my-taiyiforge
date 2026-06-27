# ADR: python-jose + slowapi + CORSMiddleware

## 状态: 已提议

## 决策
采用 python-jose（JWT）+ slowapi（限流）+ FastAPI CORSMiddleware。

## 理由
- python-jose 是 JWT 标准实现，经过安全审计
- slowapi 支持多存储后端（Redis/Memory）
- 组合式方案比框架式更灵活可控
- 各库独立升级降低风险
