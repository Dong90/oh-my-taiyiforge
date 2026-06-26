# Decompose: Todo Fullstack

> 来源：README.md · 2026-06-24 · 拆解人：TaiyiForge

## 项目概述

一个全栈 Todo 应用，包含 Express 后端 API、纯前端 HTML/CSS/JS 页面，以及 E2E 集成测试。通过 TaiyiForge 九阶段流程交付。

## 拆解清单

| # | Slug | 范围 | Profile | 依赖 | 优先级 |
|---|------|------|---------|------|--------|
| 1 | todo-api | 后端 Express CRUD API（4 端点 + 内存存储 + 健康检查） | api | — | P0 |
| 2 | todo-ui | 前端页面（HTML + CSS + JS 调用 API 渲染 DOM） | ui | todo-api | P0 |
| 3 | todo-e2e | E2E 集成测试（启动后端 → 操作 API → 验证前端渲染） | micro | todo-api | P1 |

## 依赖关系图

```
todo-api ──┬──→ todo-ui
           └──→ todo-e2e
```

- **todo-ui** 和 **todo-e2e** 都依赖 todo-api 提供 API 端点
- todo-ui 和 todo-e2e 之间互不依赖，可并行
- 建议 todo-api 先到 dev 阶段，再启动 todo-ui 和 todo-e2e

## Profile 选择理由

| Slug | Profile | 理由 |
|------|---------|------|
| todo-api | api | 纯后端 Express 服务，有路由/存储/测试多层结构，需需求→设计→开发→评审完整流程，无 UI 阶段 |
| todo-ui | ui | 纯前端 UI 改动，HTML+CSS+JS 页面，跳过需求/设计阶段，保留 UI 设计→开发→测试 |
| todo-e2e | micro | 单文件测试脚本，3 阶段（change→dev→integration），零文档 |

## 执行建议

| 规则 | 说明 |
|------|------|
| **并行上限** | ≤ 3 个 change，正好全部同时推进 |
| **依赖处理** | todo-api 先行到 dev，todo-ui 和 todo-e2e 再跟进 |
| **推荐顺序** | todo-api → todo-ui + todo-e2e（并行）→ 逐个归档 |

## 快速启动

```bash
# 1. 创建后端 API change
/taiyi:new "todo-api" --profile api

# 2. 创建前端 UI change
/taiyi:new "todo-ui" --profile ui

# 3. 创建 E2E 测试 change
/taiyi:new "todo-e2e" --profile micro

# 4. 查看进度
/taiyi:status

# 5. 逐个推进
/taiyi:continue
```
