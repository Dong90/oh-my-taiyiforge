<div align="center">

# oh-my-taiyiforge

**TaiyiForge** — 将六大工程规范转化为 AI 可执行工作流

[![npm version](https://img.shields.io/npm/v/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![CI](https://github.com/Dong90/oh-my-taiyiforge/actions/workflows/ci.yml/badge.svg)](https://github.com/Dong90/oh-my-taiyiforge/actions/workflows/ci.yml)

**Document-driven AI R&D with gates, not vibes.**

_别记阶段顺序。说 `/taiyi:new`，引擎告诉你下一步。_

[快速开始](#quick-start) · [用法指南](./docs/USAGE.md) · [架构](./docs/ARCHITECTURE.md) · [命令表](./docs/taiyi/canonical-commands.md) · [完整流程](./docs/taiyi/full-oss-flow.md) · [贡献](./CONTRIBUTING.md)

<br />

![TaiyiForge 架构图 — 六大标准 × 工作流引擎 × 九阶段 × Skill 全景 × 三重门禁](docs/diagrams/visual/taiyiforge-architecture-ai-v023-full-4k.png)

<sub>
  4K 视觉海报（非技术真源）· 可编辑真源
  <a href="./docs/taiyiforge-architecture.svg">SVG</a> ·
  <a href="./docs/c4/containers.md">C4</a>
</sub>

</div>

---

## Quick Start

**Step 1：安装**

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all    # 23 个 taiyi-* Skill → OpenCode / Claude / Codex / Cursor
npx taiyi doctor --strict-workspace
```

OpenCode 用户在 `opencode.json` 中加入：

```json
{ "plugin": ["oh-my-taiyiforge"] }
```

**Step 2：第一个变更**

```bash
npx taiyi walkthrough              # 首次体验：doctor + init + 打印下一步（不跑九阶段）
# 或直接进入日常流程：
npx taiyi new "用户登录优化"        # 创建 .taiyi/changes/<slug>/
npx taiyi status                   # 当前阶段 + 推荐 Skill
```

**Step 3：日常节奏**

在聊天里说（OpenCode / Claude / Cursor）：

```text
/taiyi:new "功能描述"
/taiyi:status
/taiyi:write                       # 写当前阶段工件
/taiyi:continue --approver "你的名字"   # 过关（change / design / review 须审批）
… 重复 write → continue …
/taiyi:commit                      # dev 后带 Taiyi-Change trailer 提交
/taiyi:archive                     # 九阶段完成后归档
```

就这些。阶段顺序、工件模板、门禁校验由**引擎**负责；聊天只负责写 Markdown 与实现代码。

> 完整 5 分钟教程 → **[docs/QUICKSTART.md](./docs/QUICKSTART.md)**

---

## 聊天轨 vs 引擎轨

TaiyiForge 刻意把职责拆开——和 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) 的「会话 Skill + CLI 控制面」思路类似，但主轴是**九阶段工件契约**：

| 表面 | 谁用 | 做什么 | 示例 |
|------|------|--------|------|
| **聊天斜杠** | 开发者 / Agent | 写工件、跑 TDD、加载专项 Skill | `/taiyi:write` · `/taiyi:apply` · `/taiyi:tdd dev` |
| **引擎 CLI** | Agent / CI **代跑** | 校验 artifact、门禁、推进 phase | `npx taiyi continue <slug>` · `npx taiyi complete <slug> change --approver "…"` |
| **Shell 入口** | Agent / CI | 与 CLI 等价，install 后写入消费方项目 | `scripts/taiyi-forge.sh status --json --compact` |
| **MCP** | Cursor 等 | 只读排查 | `taiyi_doctor` · `taiyi_audit` |

**原则**：用户只说 `/taiyi:*`；**禁止**让用户手打 `taiyi-forge.sh`。Agent 读 `status --json --compact` 的 `engineTruth`，勿把整份工件灌进对话。

Codex 用户用 `$taiyi-new` / `$taiyi-forge` 等等价入口，见 [`docs/taiyi/agents.yaml`](./docs/taiyi/agents.yaml)。

---

## Why TaiyiForge?

- **链路不丢** — 需求 → 设计 → 开发 → 测试 → 评审 → 归档，全在 `.taiyi/changes/<slug>/` 可追溯
- **Agent 不能跳关** — 上一阶段未完成，引擎拒绝 `continue`；dev 强制 TDD，integration 前过交付门
- **四端同一套 Skill** — 23 个 `taiyi-*` 经 `taiyi-forge-install` 同步到 OpenCode / Claude / Codex / Cursor
- **按需裁剪** — 7 种 profile（full → nano），大功能走九阶段，改 typo 走 nano
- **融合而不绑架** — Harness · OpenSpec · GStack · Superpowers · OMO · Spec-Kit；外挂未装则 optional 自动跳过
- **长会话可续** — Token 预算 + `/taiyi:token compress` → `CONTEXT-COMPACT.md` + handoff
- **与 OMC/OMX 并存** — 不依赖 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)；可与 [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) 多 Agent 编排配合（Taiyi 管阶段工件，OMX 管并行执行）

---

## 核心能力

### 九阶段主流程

每个变更一个 slug，顺序执行，产出固定工件：

| # | 阶段 | Skill | 产出 |
|---|------|-------|------|
| 1 | change | `taiyi-change` | `CHANGE.md` |
| 2 | requirement | `taiyi-requirement` | `REQUIREMENT.md` |
| 3 | design | `taiyi-design` | `DESIGN.md` |
| 4 | ui-design | `taiyi-ui-design` | `UI-DESIGN.md` |
| 5 | task | `taiyi-task` | `TASK.md` |
| 6 | dev | `taiyi-dev` | 代码 + 测试（**TDD**） |
| 7 | test | `taiyi-test` | `TEST.md` |
| 8 | review | `taiyi-review` | `REVIEW.md` |
| 9 | integration | `taiyi-integration` | `CHANGELOG.md` |

日常最短路径：`new → write → continue → apply → continue → … → commit → archive`

### 三重门禁

| 门禁 | 作用 | 典型触发 |
|------|------|----------|
| **Human Gate** | 关键节点人审批 | change · design · review（须 `--approver`） |
| **Quality Gate** | 工件完整 + 五维质量 | 每阶段 `continue` / `complete` |
| **Delivery Gate** | 可交付、可审计 | integration 前：有新 commit + 工作区干净 |

### Profile：按场景选深度

| Profile | 适合 | 跳过阶段 |
|---------|------|----------|
| `full` | 新功能 / 大改动 | 无（默认） |
| `api` | 后端 API / 服务 | ui-design |
| `ui` | 设计系统 / 组件库 | 无（UI harness 优先） |
| `lite` | Bug 修复 | design · ui-design · task · review |
| `spike` | MVP / 原型 | requirement · design · ui-design · task · review |
| `micro` | 个人小工具 | requirement … test · review |
| `nano` | 极简改动 | 仅 dev + integration |

```bash
/taiyi:new "修复登录超时" --profile lite
/taiyi:bug "修复登录超时"          # 场景别名 → lite
```

场景选型详见 **[docs/USAGE.md](./docs/USAGE.md)**。

### 23 个 Skill 全景

| 类型 | 数量 | 成员 |
|------|------|------|
| **主流程** | 9 | change → integration |
| **辅助** | 11 | intel-scan · architect · restyle · evolve · health · compress · diagram-c4/arch/render/pipeline/flow |
| **编排** | 3 | taiyi-forge · taiyi-orchestrator · taiyi-ultrawork |

### 编排模式

| 模式 | 是什么 | 适用 |
|------|--------|------|
| **手动主链（默认）** | write → continue，人工门处暂停 | 日常功能开发 |
| **`/taiyi:mode ralph`** | 死磕：自动跑测试直到全绿 | dev 阶段 TDD |
| **`init --auto` + orchestrator** | harness 清单 + 铁三角 optional 打卡 | 演示 / dogfood |
| **`/taiyi:mode ultrawork`** | 并行切片 + Task 派发 | 多文件独立任务 |
| **`/taiyi:mode team`** | 多 Agent 分工（原生，不依赖 OMC） | 大改动并行 |
| **`/taiyi:full-flow`** | Superpowers + gstack + OpenSpec 全链 | 开源级交付演示 |

---

## 四端支持

| 平台 | 入口 | 验证 |
|------|------|------|
| **OpenCode** | `opencode.json` → `plugin: ["oh-my-taiyiforge"]` | 聊天内 `taiyi_new` / `taiyi_*` 工具 |
| **Claude Code** | `~/.claude/skills/taiyi-*` | `taiyi-forge` Skill + Agent 代跑脚本 |
| **Codex** | `~/.codex/skills` + prompts | `$taiyi-new` / `$taiyi-forge` |
| **Cursor** | `~/.cursor/skills` + rules | `/taiyi:*` + 可选 MCP `taiyi-mcp` |

```bash
npx taiyi-forge-install --all              # 四端 + 铁三角依赖
npx taiyi-forge-install --cursor           # 仅 Cursor
npx taiyi-forge-install --all --skip-deps  # 跳过 OpenSpec / gstack 等可选外挂
```

---

## 推荐斜杠（v28 顶栏）

完整真源 → [`docs/taiyi/commands.yaml`](./docs/taiyi/commands.yaml) · [`canonical-commands.md`](./docs/taiyi/canonical-commands.md)

| 分组 | 命令 | 作用 |
|------|------|------|
| **主链** | `new` · `status` · `write` · `continue` · `apply` · `archive` | 九阶段日常遥控器 |
| **会话** | `handoff` · `resume` · `cancel` · `list` | 跨会话 / 多变更 |
| **排查** | `doctor` · `audit` · `verify` | 安装 · 流程漂移 · CI 工件门禁 |
| **交付** | `commit` · `ship` · `land` · `release` | gstack 交付链（可选） |
| **伞形** | `token …` · `test …` · `review …` · `diagram …` · `mode …` | 子命令见 canonical 文档 |

排查时 Agent 优先：

```bash
scripts/taiyi-forge.sh doctor --json --compact
scripts/taiyi-forge.sh audit --json --compact
```

---

## 六大工程标准

TaiyiForge 不是第六套规范，而是把已有规范**编排进同一状态机**：

| 标准 | 在 TaiyiForge 里 |
|------|------------------|
| **Harness Engineering** | `--auto` 铁三角 + complete 前 harness-check |
| **OpenSpec** | 可选规格镜像；未装自动跳过 |
| **GStack** | 分阶段 plan/review/ship；交付链 `/taiyi:ship` → `land` |
| **Superpowers** | change/dev/test 铁三角；TDD · verification · code-review |
| **OMO** | Human Gate：AI 执行，关键节点人审批 |
| **Spec-Kit** | `templates/` + quality-gate 五维 |

融合原则 → **[skill-fusion-principles.md](./docs/taiyi/skill-fusion-principles.md)**

---

## 架构一图读懂

```
┌─────────────────────────────────────────────────────────────┐
│  入口：taiyi CLI · taiyi-forge.sh · OpenCode 插件 · MCP      │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  workflow-engine.ts — 意图分析 · Token 预算 · 路由 · 门禁     │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  .taiyi/changes/<slug>/  — CHANGE … CHANGELOG（真源）        │
└─────────────────────────────────────────────────────────────┘
         聊天加载 taiyi-* Skill 写工件 ↑    ↓ 引擎校验 & 推进 phase
```

代码布局 → **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** · C4 真源 → **[docs/c4/](./docs/c4/)**

---

## 文档

| 文档 | 说明 |
|------|------|
| [QUICKSTART.md](./docs/QUICKSTART.md) | **5 分钟跑通**（唯一实操路径） |
| [USAGE.md](./docs/USAGE.md) | 场景选型 · 日常节奏 · 交付链 |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 架构总览与代码布局 |
| [canonical-commands.md](./docs/taiyi/canonical-commands.md) | v28 斜杠命令表 |
| [control-plane.md](./docs/taiyi/control-plane.md) | Agent 纪律 + Token 纪律 |
| [full-oss-flow.md](./docs/taiyi/full-oss-flow.md) | Superpowers + 全外挂演示链 |
| [integrations.md](./docs/taiyi/integrations.md) | 铁三角与外挂集成 |
| [AGENTS.md](./AGENTS.md) | Agent 读状态入口 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |

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
npm run build          # TypeScript → dist/
npm test               # Vitest 契约 + 九阶段 E2E
npm run dogfood        # 仓库根目录演示
npx taiyi walkthrough  # 任意目录首次体验
```

**示例工程：**

| 目录 | 用途 |
|------|------|
| [examples/full-flow-demo](./examples/full-flow-demo/README.md) | 九阶段 + 斜杠 E2E |
| [examples/commands-smoke](./examples/commands-smoke/) | 命令冒烟 |
| [examples/ci/github-actions](./examples/ci/github-actions/) | CI 模板 |

CI：[`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

---

## 参与贡献

欢迎 Issue 与 PR。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

```bash
npm test   # PR 前须通过
npm run check:docs   # 文档与 commands.yaml 同步
```

---

## 许可证

[MIT](./LICENSE) © TaiyiForge contributors
