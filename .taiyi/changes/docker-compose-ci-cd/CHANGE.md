# CHANGE: Docker 容器化 + Compose + CI/CD + 环境隔离

## Motivation

translation-assistant 项目目前缺少容器化部署方案。README 中「部署和运维」章节全部标记为待实现，包括 Dockerfile、Docker Compose、CI/CD 和环境隔离。

## Scope

- In:
  - 为 backend 编写 Dockerfile（Python 3.8+, FastAPI, uvicorn）
  - 为 frontend 编写 Dockerfile（Nginx 静态文件服务）
  - 编写 docker-compose.yml 整合前后端
  - 添加 GitHub Actions CI 流水线（lint + test）
  - 添加 .env 环境隔离（dev/staging/prod）
  - 优雅关闭（SIGTERM handler）
- Out:
  - Kubernetes 编排（超出当前规模）
  - 生产部署脚本（README 已有建议）

## Risks

- 低风险：纯 DevOps 配置，不改业务代码
- CI 流水线需要先有单元测试可跑（已存在）

## Success Criteria

- [x] `docker-compose up` 一键启动前后端
- [x] GitHub Actions CI 通过（lint + pytest）
- [x] 环境变量区分 dev/staging/prod
- [x] 容器内健康检查可用
