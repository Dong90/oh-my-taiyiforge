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
