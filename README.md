<div align="center">

# oh-my-taiyiforge

**TaiyiForge** — 将六大工程规范转化为 AI 可执行工作流

[![npm version](https://img.shields.io/npm/v/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![CI](https://github.com/Dong90/oh-my-taiyiforge/actions/workflows/ci.yml/badge.svg)](https://github.com/Dong90/oh-my-taiyiforge/actions/workflows/ci.yml)

九阶段文档驱动研发 · 三重门禁 · 四端统一控制面（OpenCode / Claude / Codex / Cursor）

[快速开始](./docs/QUICKSTART.md) · [架构](./docs/ARCHITECTURE.md) · [完整流程](./docs/taiyi/full-oss-flow.md) · [演示](./examples/minimal-project/README.md)

<br />

<img
  src="https://raw.githubusercontent.com/Dong90/oh-my-taiyiforge/main/docs/diagrams/visual/taiyiforge-architecture-ai-4k.png"
  alt="TaiyiForge 架构图 — 六大标准 × 工作流引擎 × 九阶段 × Skill 全景 × 三重门禁"
  width="100%"
/>

<sub>
  4K 视觉海报（非技术真源）· 可编辑真源
  <a href="./docs/taiyiforge-architecture.svg">SVG</a> ·
  <a href="./docs/c4/containers.md">C4</a>
</sub>

</div>

---

## 目录

- [为什么用 TaiyiForge](#为什么用-taiyiforge)
- [核心能力](#核心能力)
- [快速开始](#快速开始)
- [四端安装](#四端安装)
- [聊天命令](#聊天命令)
- [九阶段工作流](#九阶段工作流)
- [架构说明](#架构说明)
- [文档](#文档)
- [开发与测试](#开发与测试)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

---

## 为什么用 TaiyiForge

在 AI 编程工具里，**聊天**负责写工件与评审，**引擎**负责状态、门禁与推进——两套职责分开，避免「写完就忘关到哪一步」。

| 痛点 | TaiyiForge 做法 |
|------|-----------------|
| 需求→设计→开发链路断裂 | 九阶段顺序 + 工件契约（`.taiyi/changes/<slug>/`） |
| Agent 跳过测试/评审 | 质量门禁五维 + dev 强制 TDD |
| 多 IDE 各搞一套 | 23 个 `taiyi-*` Skill 四端同步安装 |
| 长会话上下文爆炸 | Token 预算 + `CONTEXT-COMPACT.md` 压缩 |

融合 **Harness Engineering · OpenSpec · GStack · Superpowers · OMO · Spec-Kit**，可选外挂未安装时自动跳过，不阻塞主流程。

---

## 核心能力

- **九阶段主流程** — change → requirement → design → ui-design → task → dev → test → review → integration
- **三重门禁** — 人工审批（change/design/review）+ 质量五维 + 交付门（git commit + 干净工作区）
- **四动词遥控器** — `new` / `status` / `continue` / `apply` / `archive`（OpenSpec 风格斜杠命令）
- **双轨调用** — 聊天加载 Skill 写 Markdown；Agent 代跑 `taiyi-forge.sh` 做 init/harness/complete
- **全自动编排** — `init --auto` + `taiyi-orchestrator` harness 清单
- **架构图流水线** — `/taiyi:diagram-pipeline`：C4 真源 → 工程图 → SVG 导出
- **OMC 兼容** — 可与 oh-my-codex 编排多 Agent 并存

---

## 快速开始

实操路径见 **[docs/QUICKSTART.md](./docs/QUICKSTART.md)**（唯一 5 分钟教程）。此处仅摘要：

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all    # 23 个 taiyi-* Skill
npx taiyi doctor --strict-workspace
```

聊天：`/taiyi:new` → `/taiyi:status` → `/taiyi:write` → `/taiyi:continue` → `/taiyi:archive`

## 文档索引

| 文档 | 用途 |
|------|------|
| [QUICKSTART.md](./docs/QUICKSTART.md) | **唯一实操路径** |
| [canonical-commands.md](./docs/taiyi/canonical-commands.md) | 斜杠命令表 |
| [control-plane.md](./docs/taiyi/control-plane.md) | Agent 纪律 + Token 纪律 |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 架构与代码布局 |
| [superpowers-flow.md](./docs/taiyi/superpowers-flow.md) | 日常 Superpowers 主轴 |
| [full-oss-flow.md](./docs/taiyi/full-oss-flow.md) | 全外挂演示链 |
| [probe-triage.md](./docs/taiyi/probe-triage.md) | CI/探测归类（维护者） |
| [AGENTS.md](./AGENTS.md) | Agent 入口指针 |

---

## 四端安装

<details>
<summary>展开：各端安装细节（详见 QUICKSTART）</summary>

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all
npx taiyi doctor
```

在 OpenCode `opencode.json` 中：

```json
{ "plugin": ["oh-my-taiyiforge"] }
```

聊天内新建变更：

```text
/taiyi:new 用户登录优化
/taiyi:status
/taiyi:continue
```

### 贡献者（本仓库）

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build && npm test
npx taiyi-forge-install --all

cd examples/minimal-project && npm install
npm run walkthrough-e2e
```

详见 [QUICKSTART.md](./docs/QUICKSTART.md)。

</details>

## 四端一览

| 平台 | 入口 | 安装验证 |
|------|------|----------|
| **OpenCode** | `opencode.json` → `plugin` | 聊天内 `taiyi_new` / `taiyi_*` 工具 |
| **Claude Code** | `~/.claude/skills/taiyi-*` | `taiyi-forge` Skill + Bash 代跑脚本 |
| **Codex** | `~/.codex/skills` + prompts | `$taiyi-new` / `$taiyi-forge` |
| **Cursor** | `~/.cursor/skills` + rules | `/taiyi:*` + 可选 MCP `taiyi-mcp` |

```bash
npx taiyi-forge-install --all          # 四端 + 铁三角依赖
npx taiyi-forge-install --cursor       # 仅 Cursor
npx taiyi-forge-install --all --skip-deps   # 跳过 OpenSpec/gstack 等
```

---

## 聊天命令

| 命令 | 作用 |
|------|------|
| `/taiyi:new <标题>` | 新建变更（自动 slug） |
| `/taiyi:status` | 当前阶段与推荐 Skill |
| `/taiyi:continue` | 写完工件后推进下一阶段 |
| `/taiyi:apply` | dev / test 实现轮 |
| `/taiyi:archive` | 九阶段完成后归档 |

排查与辅助：`/taiyi:doctor` · `/taiyi:audit` · `/taiyi:verify` · `/taiyi:health` · `/taiyi:diagram-pipeline`

完整列表：[commands.yaml](./docs/taiyi/commands.yaml) · [workflow.md](./docs/taiyi/workflow.md)

引擎（Agent / CI 代跑，勿让用户手打）：

```bash
scripts/taiyi-forge.sh new "功能名"
scripts/taiyi-forge.sh continue <slug>
scripts/taiyi-forge.sh complete <slug> <phase>
```

---

## 九阶段工作流

| # | 阶段 | Skill | 产出 |
|---|------|-------|------|
| 1 | change | taiyi-change | CHANGE.md |
| 2 | requirement | taiyi-requirement | REQUIREMENT.md |
| 3 | design | taiyi-design | DESIGN.md |
| 4 | ui-design | taiyi-ui-design | UI-DESIGN.md |
| 5 | task | taiyi-task | TASK.md |
| 6 | dev | taiyi-dev | 代码 + 测试（TDD） |
| 7 | test | taiyi-test | TEST.md |
| 8 | review | taiyi-review | REVIEW.md |
| 9 | integration | taiyi-integration | CHANGELOG.md |

**Profile**：`full` 九阶段 · `api` 跳过 ui-design · `lite` 跳过 design/ui-design/task/review

**辅助 Skill（11）**：intel-scan · architect · restyle · evolve · health · compress · diagram-c4/arch/render/pipeline/flow

**控制面（3）**：taiyi-forge · taiyi-orchestrator · taiyi-ultrawork

---

## 架构说明

| 区域 | 说明 |
|------|------|
| **工件真源** | `.taiyi/changes/<slug>/` — 上一阶段未完成不得进入下一阶段 |
| **C4 真源** | [docs/c4/](./docs/c4/) — `/taiyi:diagram-c4` 扫描代码产出 |
| **流程图** | [docs/diagrams/flows.md](./docs/diagrams/flows.md) — 门禁与 harness 可视化 |
| **六大规范** | Harness · OpenSpec（可选）· GStack · Superpowers · OMO · Spec-Kit |

```
聊天轨：加载 taiyi-* Skill → 写工件 → 铁三角评审
引擎轨：taiyi-forge.sh → 校验 artifact → 门禁 → 推进 phase
```

---

## 文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 架构总览与代码布局 |
| [QUICKSTART.md](./docs/QUICKSTART.md) | 5 分钟上手 |
| [integrations.md](./docs/taiyi/integrations.md) | Superpowers / gstack / OpenSpec 集成 |
| [control-plane.md](./docs/taiyi/control-plane.md) | 引擎控制面与 CLI |
| [diagrams/pipeline.md](./docs/diagrams/pipeline.md) | 架构图三步流水线 |
| [full-oss-flow.md](./docs/taiyi/full-oss-flow.md) | 完整开源铁三角流程 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |

---

## 开发与测试

```bash
npm run build          # TypeScript → dist/
npm test               # Vitest 契约 + E2E
npm run dogfood        # 仓库根目录演示
```

CI：GitHub Actions [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

示例项目：

- [examples/minimal-project](./examples/minimal-project/README.md) — 九阶段 walkthrough
- [examples/dogfood-showcase](./examples/dogfood-showcase/README.md) — 交付门 / legacy state 修复演示
- [examples/ci/github-actions](./examples/ci/github-actions/) — CI 模板

---

## 参与贡献

欢迎 Issue 与 PR。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

```bash
npm test   # PR 前须通过
```

---

## 许可证

[MIT](./LICENSE) © TaiyiForge contributors
