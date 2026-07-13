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
- 删除新增文件即可回滚，无数据库变更
