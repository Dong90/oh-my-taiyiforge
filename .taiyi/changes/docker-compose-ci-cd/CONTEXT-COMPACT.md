# CONTEXT-COMPACT

> 自动压缩摘要 · 优先读此文件以降低 Token；细节见各工件原文件。

## CHANGE.md
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
- [ ] `docker-compose up` 一键启动前后端
- [ ] GitHub Actions CI 通过（lint + pytest）
- [ ] 环境变量区分 dev/staging/prod
- [ ] 容器内健康检查可用

## CONTEXT.md
# CONTEXT: docker-compose-ci-cd
> 生成：taiyi-intel-scan · 只读扫描，非设计结论

## Scope 摘要
为 translation-assistant 项目添加 Docker 容器化、Docker Compose 本地开发环境、CI/CD 流水线和环境隔离配置。

## 相关目录
| 路径 | 关系 | 备注 |
|------|------|------|
| examples/translation-assistant/ | 必读 | 项目根，含 backend/frontend |
| examples/translation-assistant/agent/backend/ | 参考 | 已实现的 llm-core 后端代码 |
| examples/translation-assistant/agent/frontend/ | 参考 | 已实现的前端代码 |
| .github/workflows/ | 参考 | 现有 CI 配置（如有） |

## 模式清单
- 后端：Python 3.8+, FastAPI, uvicorn, port 8000
- 前端：HTML5 + CSS3 + 原生 JS, http.server port 8080
- 配置：pydantic-settings, .env 文件
- 依赖管理：pip + requirements.txt
- 测试：pytest, pytest-asyncio

## 风险区
| 级别 | 位置 | 说明 | 建议 |
|------|------|------|------|
| LOW | 项目根 | 无现有 Dockerfile | 从零创建，无冲突风险 |

## Read First
1. examples/translation-assistant/README.md — 项目全貌、部署说明节
2. examples/translation-assistant/agent/backend/requirements.txt — Python 依赖清单
3. examples/translation-assistant/agent/backend/app/main.py — FastAPI 入口

## Handoff
- change：Scope 为 Docker + CI/CD + 环境隔离，不涉及业务代码
- design：跳过（micro profile）
