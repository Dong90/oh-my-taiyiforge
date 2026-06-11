<div align="center">

# TaiyiForge

**把六大 AI 工程规范编排成可执行的九阶段研发工作流**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
<!-- NPM-PUBLISH-TOGGLE: v0.24 后把下面两行打开，注释掉这行
[![npm version](https://img.shields.io/npm/v/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
-->
[![Version](https://img.shields.io/badge/version-0.23.0-orange)](CHANGELOG.md)
[![CI](https://img.shields.io/github/actions/workflow/status/Dong90/oh-my-taiyiforge/ci.yml?branch=main&label=CI)](https://github.com/Dong90/oh-my-taiyiforge/actions/workflows/ci.yml)
[![Platforms](https://img.shields.io/badge/platforms-OpenCode%20%7C%20Claude%20%7C%20Codex%20%7C%20Cursor-8a2be2)](docs/QUICKSTART.md)

**Document-driven AI R&D with gates, not vibes.**

> 别记阶段顺序。说 `/taiyi:new`，引擎告诉你下一步。

[快速开始](#quick-start) · [用法指南](docs/USAGE.md) · [架构](docs/ARCHITECTURE.md) · [命令表](docs/taiyi/canonical-commands.md) · [完整流程](docs/taiyi/full-oss-flow.md) · [贡献](CONTRIBUTING.md)

<br />

![TaiyiForge 架构图 — 六大标准 × 工作流引擎 × 九阶段 × Skill 全景 × 三重门禁](docs/diagrams/visual/taiyiforge-architecture-ai-v023-full-4k.png)

<sub>4K 视觉海报（非技术真源）· 可编辑真源 <a href="docs/taiyiforge-architecture.svg">SVG</a> · <a href="docs/c4/containers.md">C4</a></sub>

</div>

---

## TL;DR（30 秒读完）

![Real terminal demo](docs/diagrams/demo.gif)

<sub>27 秒 · 真终端 · <a href="docs/diagrams/demo.cast">asciicast 源文件</a>（在 <a href="https://asciinema.org">asciinema.org</a> 或本地 `asciinema play docs/diagrams/demo.cast` 播放）</sub>

- **是什么**：一套把"需求 → 设计 → 开发 → 测试 → 评审 → 归档"固化成九阶段工件契约的 AI 研发工作流引擎，外加 23 个 `taiyi-*` Skill。
- **给谁用**：用 OpenCode / Claude / Codex / Cursor 做严肃项目（中型以上、有 review、有交付门）的团队与个人。
- **怎么用**：在你的项目里跑 `taiyi new "功能名"`，按引擎提示写 `CHANGE.md` / `REQUIREMENT.md` / `DESIGN.md` … 九阶段走完，**所有中间产物留痕可审计**。
- **为什么不是另一套规范**：TaiyiForge 不发明规范，**把 Harness · OpenSpec · GStack · Superpowers · OMO · Spec-Kit 编排进同一个状态机**——谁装了用谁的 optional，没装自动跳过。

---

## Why TaiyiForge？

| 你踩过的坑 | TaiyiForge 的回答 |
|-----------|------------------|
| Agent 中途忘了阶段顺序，跳着写代码 | 上一阶段未完成 → 引擎**拒绝** `continue`；dev 强制 TDD |
| 改到一半上下文炸了，方案、需求、设计全丢了 | 全在 `.taiyi/changes/<slug>/` 可追溯，token 超阈值自动 `CONTEXT-COMPACT.md` |
| 四端（OpenCode/Claude/Codex/Cursor）各写一套流程 | **一套 `taiyi-*` Skill**，装到四端任意一个都能用 |
| 改了 typo 也得走九阶段？ | 7 种 profile（full → nano），按变更复杂度**自动选路** |
| 关键节点不敢让 AI 自己拍板 | change / design / review 三处**人工门** + `--approver`，默认不跳过 |
| 不知道装的 Skill 在干什么 | `taiyi doctor / audit` 自检 + 失败项 / high findings 排查 |
| 想和 OMC / OMX 并存 | 不绑定 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)，Taiyi 管工件、OMX 管并行 |

---

## 九阶段主流程

每个变更一个 slug，顺序执行，产出固定工件。**人工门**须 `--approver`，引擎才会放行。

| # | 阶段 | 类别 | Skill | 产出 | 备注 |
|---|------|------|-------|------|------|
| 1 | change | 人工门 | `taiyi-change` | `CHANGE.md` | 变更提案，3-5 段定边界 |
| 2 | requirement | 自动 | `taiyi-requirement` | `REQUIREMENT.md` | 验收标准 + AC checkbox |
| 3 | design | 人工门 | `taiyi-design` | `DESIGN.md` | ≥2 方案对比 + 决策 |
| 4 | ui-design | 自动 | `taiyi-ui-design` | `UI-DESIGN.md` | 仅含 UI 的变更走 |
| 5 | task | 自动 | `taiyi-task` | `TASK.md` | 切成可独立 PR 的薄片 |
| 6 | dev | 自动 | `taiyi-dev` | `TDD 测试 + 最小实现` | **强制 TDD**，先红后绿 |
| 7 | test | 自动 | `taiyi-test` | `TEST.md` | 摘要留痕，E2E 走 CI |
| 8 | review | 人工门 | `taiyi-review` | `REVIEW.md` | 跨 A I 评审 + 高优项必修 |
| 9 | integration | 自动 | `taiyi-integration` | `CHANGELOG.md` 合并 | 交付门：`audit` + `deliveryVerifyCmd` |
| — | archive | 收尾 | `taiyi-integration` | `.taiyi/archive/` | 九阶段全过才放行 |

完整命令见 **[canonical-commands.md](docs/taiyi/canonical-commands.md)** · 工件目录 → **[artifact-layout.md](docs/taiyi/artifact-layout.md)**

---

## 一套 Skill，四端共享

一次 `taiyi-forge-install --all` 同步到 4 个 harness，未装的自动跳过：

| Harness | 验证 | 备注 |
|---------|------|------|
| **OpenCode** | `opencode.json` 含 `oh-my-taiyiforge`；重启后看到 `taiyi_new` / `taiyi_*` 工具 | 官方插件，深度集成 |
| **Claude Code** | `ls ~/.claude/skills/taiyi-change` · `~/.claude/mcp.json` | 斜杠 / Skill / MCP |
| **Codex** | `ls ~/.codex/skills/taiyi-change` · `~/.codex/mcp.json` | `$taiyi-*` 关键词驱动 |
| **Cursor** | `~/.cursor/skills/taiyi-change` · `taiyiforge.mdc` · 项目 `.cursor/mcp.json` | 规则 + MCP 双通道 |

Codex 用户走 `$taiyi-new` / `$taiyi-forge` 等关键词入口；详见 [agents.yaml](docs/taiyi/agents.yaml)。

---

## Quick Start

> **状态说明**：v0.23.0 **尚未发布到 npm**，目前唯一安装路径是**源码安装**。CI 跑通后会上 npm，徽章会同步切换。

### 方式 A：源码安装（推荐，现在就用）

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build && npm test
```

### 方式 B：在你的项目里体验（同样是源码路径）

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build

# 装到四端 + 选装铁三角（OpenSpec / gstack / Superpowers / web-quality-skills）
node scripts/taiyi-forge.sh install --all
# 或只装某一端：
node scripts/taiyi-forge.sh install --cursor
node scripts/taiyi-forge.sh install --claude --cursor
# 不想拉铁三角：--skip-deps
```

### 方式 C：跑通演示工程

```bash
cd examples/minimal-project
npm install
npm run chat-demo          # 聊天动词：new / status / check / continue
npm run walkthrough-e2e    # 九阶段 shell E2E + 铁三角
npm run taiyi:doctor       # 工作区 + 安装自检
```

> 想从 npm 装？等 [Releases](https://github.com/Dong90/oh-my-taiyiforge/releases) 公告，`npm install oh-my-taiyiforge` 会先在这里点亮。

---

## 第一个变更（5 分钟跑通）

```bash
mkdir demo && cd demo
npm init -y
git clone https://github.com/Dong90/oh-my-taiyiforge.git .taiyi-forge   # 临时放引擎
# 或者以后 npm 发布后直接 npm install oh-my-taiyiforge

# 推荐入口：自动 slug + 引擎引导
npx taiyi walkthrough
npx taiyi new "用户登录优化"        # 写入 .taiyi/changes/<slug>/
npx taiyi status                   # 当前阶段 + 推荐 Skill + 下一步

# 编辑 .taiyi/changes/<slug>/CHANGE.md，然后：
npx taiyi complete <slug> change --approver "你的名字"   # 人工门
npx taiyi continue <slug>                                 # 自动门

# 聊天里（OpenCode / Claude / Cursor）说：
/taiyi:new "功能描述"
/taiyi:status
/taiyi:write                       # 写当前阶段工件
/taiyi:continue --approver "你的名字"
/taiyi:commit                      # dev 后带 Taiyi-Change trailer
/taiyi:archive                     # 九阶段完成后归档
```

就这些。**阶段顺序、工件模板、门禁校验由引擎负责**；你只负责写 Markdown 与实现代码。

---

## 聊天轨 vs 引擎轨

TaiyiForge 故意把职责拆开——和 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) 「会话 Skill + CLI 控制面」思路类似，但主轴是**九阶段工件契约**：

| 表面 | 谁用 | 做什么 | 示例 |
|------|------|--------|------|
| **聊天斜杠** | 开发者 / Agent | 写工件、跑 TDD、加载专项 Skill | `/taiyi:write` · `/taiyi:apply` · `/taiyi:tdd dev` |
| **引擎 CLI** | Agent / CI **代跑** | 校验 artifact、门禁、推进 phase | `npx taiyi continue <slug>` · `npx taiyi complete <slug> change --approver "…"` |
| **Shell 入口** | Agent / CI | 与 CLI 等价，install 后写入消费方项目 | `scripts/taiyi-forge.sh status --json --compact` |
| **MCP** | Cursor 等 | 只读排查 | `taiyi_doctor` · `taiyi_audit` |

**原则**：用户只说 `/taiyi:*`；**禁止**让用户手打 `taiyi-forge.sh`。Agent 读 `status --json --compact` 的 `engineTruth`，勿把整份工件灌进对话。

排查时 Agent 优先：

```bash
scripts/taiyi-forge.sh doctor --json --compact
scripts/taiyi-forge.sh audit --json --compact
```

---

## 核心能力

- **九阶段工件契约** — 需求 → 设计 → 开发 → 测试 → 评审 → 归档，全在 `.taiyi/changes/<slug>/` 可追溯
- **Agent 不能跳关** — 上一阶段未完成，引擎拒绝 `continue`；dev 强制 TDD，integration 前过交付门
- **四端同一套 Skill** — 23 个 `taiyi-*` 经 `taiyi-forge-install` 同步到 OpenCode / Claude / Codex / Cursor
- **按需裁剪** — 7 种 profile（full → nano），大功能走九阶段，改 typo 走 nano
- **融合而不绑架** — Harness · OpenSpec · GStack · Superpowers · OMO · Spec-Kit 外挂，未装则 optional 自动跳过
- **长会话可续** — Token 预算 + `/taiyi:token compress` → `CONTEXT-COMPACT.md` + handoff
- **与 OMC/OMX 并存** — 不依赖 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)；可与 [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) 多 Agent 编排配合（Taiyi 管阶段工件，OMX 管并行）
- **TDD 强制** — dev 阶段先写失败测试，再写最小实现；`npm test` 跑通才放行 test 阶段
- **平台冒烟** — CI matrix 跑 OpenCode / Claude / Codex / Cursor 四端，避免单端漂移

---

## 架构一图读懂

```
┌─────────────────────────────────────────────────────────────┐
│  入口：taiyi CLI · taiyi-forge.sh · OpenCode 插件 · MCP      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  workflow-engine — 意图分析 · Token 预算 · 路由 · 门禁      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  .taiyi/changes/<slug>/  — CHANGE … CHANGELOG（真源）        │
└─────────────────────────────────────────────────────────────┘
         聊天加载 taiyi-* Skill 写工件 ↑    ↓ 引擎校验 & 推进 phase
```

- 代码布局 → **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
- C4 真源 → **[docs/c4/](docs/c4/)**
- 视觉海报（顶部）→ [docs/diagrams/visual/](docs/diagrams/visual/)

---

## 文档导航

| 文档 | 说明 | 何时读 |
|------|------|--------|
| [docs/QUICKSTART.md](docs/QUICKSTART.md) | 5 分钟跑通 | 第一次安装 |
| [docs/diagrams/demo.gif](docs/diagrams/demo.gif) | 真终端录屏（27s） | 快速感受引擎 |
| [docs/USAGE.md](docs/USAGE.md) | 场景选型 · 日常节奏 · 交付链 | 跑通之后 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构总览与代码布局 | 想改引擎 / 排查问题 |
| [docs/taiyi/canonical-commands.md](docs/taiyi/canonical-commands.md) | v28 斜杠命令表 | 找命令 |
| [docs/taiyi/control-plane.md](docs/taiyi/control-plane.md) | Agent 纪律 + Token 纪律 | 让 Agent 接手 |
| [docs/taiyi/full-oss-flow.md](docs/taiyi/full-oss-flow.md) | Superpowers + 全外挂演示链 | 想看端到端例子 |
| [docs/taiyi/integrations.md](docs/taiyi/integrations.md) | 铁三角与外挂集成 | 装选装件 |
| [AGENTS.md](AGENTS.md) | Agent 读状态入口 | Agent 配置 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献指南 | 提 PR 前 |
| [CHANGELOG.md](CHANGELOG.md) | 变更日志 | 看更新 |

---

## 开发与验证

**贡献者克隆本仓库：**

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build && npm test
npx taiyi-forge-install --all
```

**常用命令：**

```bash
npm test               # Vitest 契约 + 九阶段 E2E
npm run test:watch     # 监视模式
npm run build          # TypeScript → dist/
npm run dogfood        # 仓库根演示（自己吃自己狗粮）
npm run ci:platforms   # 四端平台冒烟（opencode/claude/codex/cursor）
npm run check:docs     # 文档与 commands.yaml 同步校验
```

**示例工程：**

| 目录 | 用途 |
|------|------|
| [examples/full-flow-demo](examples/full-flow-demo/README.md) | 九阶段 + 斜杠 E2E |
| [examples/commands-smoke](examples/commands-smoke/) | 命令冒烟 |
| [examples/ci/github-actions](examples/ci/github-actions/) | CI 模板 |
| [examples/minimal-project](examples/minimal-project/) | 最小接入演示 |

CI：[`.github/workflows/ci.yml`](.github/workflows/ci.yml) · 平台冒烟在 4×ubuntu matrix 跑全四端。

---

## 路线图与状态

| 版本 | 状态 | 关键节点 |
|------|------|----------|
| v0.23.0 | ✅ 已发布 | canonical v28 收敛 · catalog 校验门禁 · skill-fusion 原则文档化 |
| v0.24.x | 🚧 进行中 | npm 首发包 · `oh-my-taiyiforge` 装到消费方项目零编译 |
| v1.0.0 | ⏳ 规划 | 锁住 9 阶段 API · 4 端 parity · 外部 case study 收集 |

**已可用**：九阶段全链路 · 四端共享 Skill · TDD 强制 · Token 压缩 · 平台冒烟 CI
**未到位**：npm 一键安装（v0.24 目标）· 商业级 SLA · 完整 i18n

---

## 社区与贡献

- 🐛 **报告 Bug**：[GitHub Issues](https://github.com/Dong90/oh-my-taiyiforge/issues/new) · `bug` 标签
- 💡 **想法 / RFC**：[Discussions](https://github.com/Dong90/oh-my-taiyiforge/discussions)
- 🔧 **提 PR**：先读 [CONTRIBUTING.md](CONTRIBUTING.md)，`npm test` + `npm run check:docs` 必须绿
- ⭐ **Star / Watch**：留个标，下一个 release 你会收到通知
- 🧵 **Codex 用户**：搜 `$taiyi-*` 关键词；四端入口决策树见 [docs/taiyi/invoke.yaml](docs/taiyi/invoke.yaml)

行为准则：遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 精神，对事不对人。

---

## 许可证

[MIT](LICENSE) © 2026 TaiyiForge contributors

## 致谢

灵感来自：[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) · [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) · Harness Engineering · OpenSpec · GStack · Superpowers · OMO · Spec-Kit。
