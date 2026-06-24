<div align="center">

[English](README.en.md) · **简体中文**

# TaiyiForge（太一炉）

**把 AI 写代码的玄学，变成一条可执行、可审计的工程流水线。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
[![CI](https://img.shields.io/github/actions/workflow/status/Dong90/oh-my-taiyiforge/ci.yml?branch=main&label=CI)](https://github.com/Dong90/oh-my-taiyiforge/actions/workflows/ci.yml)
[![Platforms](https://img.shields.io/badge/platforms-OpenCode%20%7C%20Claude%20%7C%20Codex%20%7C%20Cursor-8a2be2)](docs/QUICKSTART.md)

</div>

![TaiyiForge 架构](docs/diagrams/visual/taiyiforge-architecture-ai-v023-full-4k-zh-v2-fix.png)

[快速开始](#快速开始) · [核心能力](#核心能力) · [文档](#文档) · [社区](#社区)

---

## 为什么需要 TaiyiForge？

用 AI 写代码很简单。用 AI 做工程很难。

| 你遇到的问题 | 根因 |
|---------|---------|
| Agent 跳过需求/设计，直接写代码 | 没有阶段约束，AI 总会走捷径 |
| 长会话上下文爆炸，之前写的全丢了 | 没有 token 管理机制，上下文就是消耗品 |
| Claude / Codex / Cursor 各一套流程 | 同一特性四套仪式，按工具入职不按团队 |
| 没人敢让 AI 独立拍板 | 没有门控的 review 形同虚设 |
| 装好的 Skill 实际行为没人说得清 | 文档漂移，出问题没法追溯 |

**TaiyiForge 的回答**：一套九阶段工件契约 + 状态机引擎。在四套 AI 终端里行为完全一致。

> `/taiyi:new` → 引擎告诉你下一步。不用背阶段顺序，不用记工件模板。

---

## 演示

27 秒终端实录。从零创建一个 change，引擎自动推进阶段：

![终端演示](docs/diagrams/demo.gif)

<sub>注：`/taiyi:new` → `/taiyi:status` → `/taiyi:write` → `/taiyi:continue`，四步走完一个阶段。</sub>

---

## 快速开始

```bash
# 1. 安装
npm install oh-my-taiyiforge

# 2. 同步 Skill 到你的 AI 终端（Claude / Cursor / OpenCode / Codex）
npx taiyi-forge-install --all

# 3. 在聊天里创建第一个 change
/taiyi:new "优化登录流程"
/taiyi:status
```

**你只管写 Markdown 和代码。阶段顺序、工件模板、门控校验全是引擎的活。**

```bash
# 只装某一端
npx taiyi-forge-install --cursor
npx taiyi-forge-install --claude --opencode

# 源码安装
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge && npm install && npm run build
node scripts/taiyi-forge.sh install --all
```

[详细安装 →](docs/QUICKSTART.md)

---

## 核心能力

### 九阶段流水线

每次变更顺序走九步，每步固定产出。关键节点 **人类门控**——AI 不能放行自己。

```
change → requirement → design → ui-design → task → dev → test → review → integration
   ↑人类审批            ↑人类审批                                   ↑人类审批
```

| 阶段 | 产出 | 拍板 |
|------|------|------|
| change | 方案 + 范围边界 | **人** |
| requirement | 验收标准 + AC | 引擎 |
| design | ≥2 方案对比 + 决策 | **人** |
| ui-design | UI/UX 契约 | 引擎（仅触 UI 时） |
| task | 可独立 PR 的片段 | 引擎 |
| dev | TDD 先红后绿 | 引擎 |
| test | 测试证据摘要 | 引擎 |
| review | 跨 AI 评审 | **人** |
| integration | 交付门控 | 引擎 |

[完整流程 →](docs/taiyi/full-oss-flow.md)

### 一套命令，四端通用

不管是 Claude Code 的 `/taiyi:new`、Cursor 的同名 slash、Codex 的 `$taiyi-new`，还是 OpenCode 的插件工具——**同一套词汇，同一种行为**。

| 命令 | 做什么 |
|------|-------|
| `/taiyi:plan` | 项目规划：README → 模块拆分 + 批量创建 |
| `/taiyi:new` | 创建变更 |
| `/taiyi:status` | 查看进度 |
| `/taiyi:write` | 写当前阶段 |
| `/taiyi:continue` | 推进下一阶段 |
| `/taiyi:apply` | 进入实现 |
| `/taiyi:archive` | 全阶段归档 |

[29 条完整命令表 →](docs/taiyi/canonical-commands.md)

### 项目级 vs Change 级

| 层级 | 入口 | 做什么 | 产出 |
|------|------|--------|------|
| **项目级** | `/taiyi:plan` | 把大需求拆成模块 + 推荐 profile + 处理冲突 | 批量 `/taiyi:new` |
| **Change 级** | `/taiyi:new` | 单模块走九阶段 | CHANGE → CHANGELOG |

### 不止流水线

- **强制 TDD**：dev 阶段先红后绿，不是建议是硬约束
- **evidence 防假过门**：每个 AC 必须配可执行验证命令，跑不过不放
- **token 压缩**：长会话自动产出 `CONTEXT-COMPACT.md`，跨天无缝续上
- **ChangeGraph**：自动追踪变更间依赖，改一处知全局
- **不搞一刀切**：大功能 `full`，小修复 `lite`，typo 改 `nano`

---

## 对比

| | 直接跟 AI 对话 | TaiyiForge |
|---|---|---|
| 流程约束 | 靠 prompt 和记忆祈祷 | 状态机强制推进 |
| 人类审批 | 看心情，容易跳过 | `--approver` 硬拦，不批不放 |
| 多工具一致性 | 换工具换流程 | 同一套 Skill |
| 上下文持久 | 丢了重新聊 | token 压缩 + 断点续传 |
| 灵活度 | 全靠自觉 | 10 种 profile，按需选择 |

---

## 文档

| 文档 | 内容 | 什么时候读 |
|------|------|-----------|
| [QUICKSTART](docs/QUICKSTART.md) | 5 分钟走通全流程 | 第一次用 |
| [USAGE](docs/USAGE.md) | 日常节奏、场景、交付链 | 跑通之后 |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | 系统架构 + 代码布局 | 想改引擎 |
| [canonical-commands](docs/taiyi/canonical-commands.md) | 29 条 slash 命令表 | 查命令 |
| [control-plane](docs/taiyi/control-plane.md) | Agent 纪律 + token 纪律 | 给 Agent 配 onboarding |
| [full-oss-flow](docs/taiyi/full-oss-flow.md) | Superpowers + 全插件端到端 | 想看完整流程 |
| [CONTRIBUTING](CONTRIBUTING.md) | 贡献指南 | 开 PR 之前 |
| [CHANGELOG](CHANGELOG.md) | 发布说明 | 查更新 |

---

## 社区

- 🐛 [报告 Bug](https://github.com/Dong90/oh-my-taiyiforge/issues/new?labels=bug)
- 💡 [想法 & 讨论](https://github.com/Dong90/oh-my-taiyiforge/discussions)
- 🔧 [贡献代码](CONTRIBUTING.md) — `npm test` 必须绿
- ⭐ **Star 一下，下次发布不迷路**

TaiyiForge 不发明新标准——它把 **Harness · OpenSpec · GStack · Superpowers · OMO · Spec-Kit** 编排成一台状态机。装了什么用什么，其余自动跳过。

---

## 许可证

[MIT](LICENSE) © 2026 TaiyiForge contributors

灵感来源：[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) · [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) · Harness Engineering · OpenSpec · GStack · Superpowers · OMO · Spec-Kit
