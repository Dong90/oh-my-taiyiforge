<div align="center">

[English](README.en.md) · **简体中文**

# TaiyiForge（太一炉）

**把 AI 写代码的玄学，变成一条可执行、可审计的工程流水线。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
[![CI](https://img.shields.io/github/actions/workflow/status/Dong90/oh-my-taiyiforge/ci.yml?branch=main&label=CI)](https://github.com/Dong90/oh-my-taiyiforge/actions/workflows/ci.yml)
[![Platforms](https://img.shields.io/badge/platforms-OpenCode%20%7C%20Claude%20%7C%20Codex%20%7C%20Cursor-8a2be2)](docs/QUICKSTART.md)

![TaiyiForge 架构](docs/diagrams/visual/taiyiforge-architecture-ai-full-4k-zh.png)

</div>

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

> `/taiyi:plan` 默认半自动（拆模块 + 推荐 profile，人确认后批量 `/taiyi:new`）；切到 auto 模式即可一键生成全栈骨架（见下方"一键生成"小节）。不用背阶段顺序，不用记工件模板。

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

# 或者：把整份需求丢给 /taiyi:plan，让引擎一次性拆出全部模块
/taiyi:plan README.md           # 也可以是 PRD.md / PDF / URL
# → 自动生成 examples/<项目>/agent/{backend,frontend}/ 全栈骨架（见下方"一键生成"小节）
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

**v30 推荐顶栏（21 条）**：

| 组 | 命令 |
|----|------|
| 项目 (1) | `/taiyi:plan [file]` — README/PRD/PDF/URL → 多个 change |
| 主链 (6) | `/taiyi:new` · `/taiyi:status` · `/taiyi:write` · `/taiyi:continue` · `/taiyi:apply` · `/taiyi:archive` |
| 会话 (4) | `/taiyi:pause` · `/taiyi:pause --resume` · `/taiyi:cancel` · `/taiyi:list` |
| 排查 (2) | `/taiyi:verify` · `/taiyi:render` |
| 交付 (3) | `/taiyi:commit` · `/taiyi:ship` · `/taiyi:land` |
| 伞形 (5) | `/taiyi:skill <name>` · `/taiyi:token …` · `/taiyi:test …` · `/taiyi:review …` · `/taiyi:diagram …` |

[21 条完整命令表 →](docs/taiyi/canonical-commands.md)

### 项目级 vs Change 级

| 层级 | 入口 | 做什么 | 产出 |
|------|------|--------|------|
| **项目级** | `/taiyi:plan` | 把大需求拆成模块 + 推荐 profile + 处理冲突 | 批量 `/taiyi:new` |
| **Change 级** | `/taiyi:new` | 单模块走九阶段 | CHANGE → CHANGELOG |

### `/taiyi:plan` 一键生成的全栈骨架（auto 模式）

`/taiyi:plan` 默认半自动——拆完模块后等人确认再批量 `/taiyi:new`。**auto 模式**则一口气把后端、前端、测试、迁移全跑完，单条命令生成可直接跑的全栈工程。

下面就是 auto 模式一次产出的真实结构（[`examples/translation-assistant/agent/`](examples/translation-assistant/agent/)，79 文件 / 23 目录）：

```
agent/
├── backend/                          # FastAPI 后端
│   ├── app/
│   │   ├── main.py                   # 入口
│   │   ├── controllers/v1/           # HTTP 层（路由 + 校验）
│   │   ├── services/                 # 业务编排（LLM 调用、缓存、限流）
│   │   ├── strategies/               # ≥2 策略可替换（同步 / 异步 / 流式翻译）
│   │   ├── repositories/             # 数据访问
│   │   ├── models/                   # ORM / Schema
│   │   ├── middleware/               # auth / logging / ratelimit / cors
│   │   ├── adapters/                 # 外部服务接入（LLM provider、Redis）
│   │   ├── tasks/                    # 异步任务
│   │   ├── db/  cache/  telemetry/  core/  config/  # 横切关注点
│   │   └── alembic/env.py            # 迁移入口
│   └── tests/
│       ├── test_controllers.py test_services.py test_core.py
│       ├── test_models.py test_adapters.py test_strategies.py
│       └── integration/  performance/  e2e/         # 三层测试套件
└── frontend/                         # 前端
    ├── index.html                    # 入口
    ├── app.js                        # 业务逻辑
    ├── style.css                     # 样式
    └── metrics.js                    # 前端指标上报
```

**对应九阶段工件**：每个模块在 `.taiyi/changes/<slug>/` 产出 `{phase}.json` + hbs 渲染的 `CHANGE.md → … → CHANGELOG.md`（本地可见，默认不提交仓库）。

**怎么跑**：从需求文件开始

```bash
/taiyi:plan README.md --auto         # auto 模式：一键骨架
/taiyi:plan PRD.pdf --profile=full   # 半自动：拆模块后等人确认
```

[完整示例 →](examples/translation-assistant/agent/) · [plan 命令参考 →](docs/taiyi/canonical-commands.md#v30-项目1)

### 不止流水线

- **强制 TDD**：dev 阶段先红后绿，不是建议是硬约束
- **evidence 防假过门**：每个 AC 必须配可执行验证命令，跑不过不放
- **token 压缩**：长会话自动产出 `CONTEXT-COMPACT.md`，跨天无缝续上
- **ChangeGraph**：自动追踪变更间依赖，改一处知全局
- **不搞一刀切**：大功能 `full`，小修复 `lite`，typo 改 `nano`
- **5 个插件式 Registry**（v1.0.0-rc.1）：Profile / CodePattern / SSOTRule / Extractor / RunnerPolicy 统一为 `Registry<T>` 抽象，支持 builtin + YAML + `node_modules` 三种扩展源，老 API 保持兼容。详见 [CHANGELOG](CHANGELOG.md)。

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
| [nine-phase-flow](docs/taiyi/nine-phase-flow.md) | 九阶段步骤、过关命令、profile 跳过 | 跑某一阶段时 |
| [USAGE](docs/USAGE.md) | 日常节奏、场景、交付链 | 跑通之后 |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | 系统架构 + 代码布局 | 想改引擎 |
| [canonical-commands](docs/taiyi/canonical-commands.md) | 21 条 slash 命令表（v30 顶栏） | 查命令 |
| [examples/translation-assistant/agent/](examples/translation-assistant/agent/) | `/taiyi:plan --auto` 一次产出的全栈骨架 | 想要代码长什么样 |
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
