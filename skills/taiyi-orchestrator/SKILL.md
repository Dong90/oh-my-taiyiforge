---
name: taiyi-orchestrator
description: TaiyiForge 统一入口 — 意图解析、阶段路由、Token预算、工件预检。Use when 用户说"开始/继续/审查/测试/设计"等流程相关意图。
paradigm: Navigator
---

# taiyi-orchestrator

## Goal
解析用户意图，自动：1) 读项目状态 2) 工件前置检查 3) 意图路由 4) Token预算估选挡位 5) 路由声明 6) 进入对应Skill

## Workflow

### 第一步 · 读取项目状态
读 `.taiyi/changes/` 下所有 `state.json`，找活跃change。

### 第二步 · Artifact Preflight Gate
路由前检查上游工件是否齐全，缺失→回退补齐。

### 第三步 · Token预算 + 挡位
估算token消耗，让用户选挡位（完整/极简/单点/不走flow）。成本因子：前端+20%、schema变更+10%、task<3→-30%、task>10→+50%

### 第四步 · 老项目入场检测
探测 AGENTS.md / CLAUDE.md / .cursor/rules/ 等已有AI文档，反问用户处理方式。

### 第五步 · 意图匹配 & 路由
按关键词匹配阶段（继续→dev、审查→review、测试→test、设计→design等）

### 第六步 · 路由声明（必须）
进入前输出：路由/Change-ID/已加载/未加载/Token预算/第一动作

### 第七步 · 加载工件策略
每阶段标注必读vs按需，控制token消耗。

### 第八步 · 执行对应Skill

## Paradigm标注
| Skill | Paradigm |
|-------|----------|
| taiyi-change/requirement | Partner |
| taiyi-design/ui-design | Architect |
| taiyi-task | Navigator |
| taiyi-dev/test/integration | Operator |
| taiyi-review/health | Scout |

## 禁止
- 跳过Artifact Preflight
- 跳过Token预算预估
- 跳过路由声明
- Preflight失败伪造"已满足"
