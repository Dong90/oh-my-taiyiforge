<div align="center">

[English](README.en.md) · **[简体中文](README.md)**

# TaiyiForge(太一炉)

**把六套 AI 工程标准,变成一条可执行、可审计的九阶段研发流水线**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![npm version](https://img.shields.io/npm/v/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-taiyiforge.svg)](https://www.npmjs.com/package/oh-my-taiyiforge)
[![Version](https://img.shields.io/badge/version-0.24.0-orange)](CHANGELOG.md)
[![v28 canonical](https://img.shields.io/badge/v28-28%20slashes%20%C2%B7%206%20umbrellas-blue)](docs/taiyi/canonical-commands.md)
[![CI](https://img.shields.io/github/actions/workflow/status/Dong90/oh-my-taiyiforge/ci.yml?branch=main&label=CI)](https://github.com/Dong90/oh-my-taiyiforge/actions/workflows/ci.yml)
[![Platforms](https://img.shields.io/badge/platforms-OpenCode%20%7C%20Claude%20%7C%20Codex%20%7C%20Cursor-8a2be2)](docs/QUICKSTART.md)

**用文档驱动 AI 研发,用门控代替玄学。**

> 不用背阶段顺序。说一句 `/taiyi:new`,引擎告诉你下一步。

[快速上手](#快速上手) · [使用指南](docs/USAGE.md) · [架构](docs/ARCHITECTURE.md) · [命令参考](docs/taiyi/canonical-commands.md) · [完整流程](docs/taiyi/full-oss-flow.md) · [贡献](CONTRIBUTING.md)

<br />

![TaiyiForge 架构 — 六套标准 × 工作流引擎 × 九阶段 × Skill 宇宙 × 三层门控](docs/diagrams/visual/taiyiforge-architecture-ai-v023-full-4k-zh-v2-fix.png)

</div>

---

## 1 · 问题

![真实终端演示](docs/diagrams/demo.gif)

<sub>27 秒真实终端录制 · <a href="docs/diagrams/demo.cast">asciicast 源</a>(可在 <a href="https://asciinema.org">asciinema.org</a> 播放,或本地 `asciinema play docs/diagrams/demo.cast`)</sub>

每个用 AI 做严肃项目的团队,都踩过这些坑:

| 踩过的坑 | 为什么痛 |
|---------|---------|
| Agent 中途忘掉阶段顺序,跳到写代码 | 设计半成品、需求丢失、review 重做 |
| 长会话上下文爆炸,需求/设计/代码全丢 | 跨天/跨会话无法续上,只能推倒重来 |
| OpenCode / Claude / Codex / Cursor 各自一套流程 | 同一特性四种仪式,新人按工具入职而不是按团队 |
| 改个 typo 也要走完九阶段 | 死板流水线吃光小修复的节奏 |
| 关键节点不敢让 AI 拍板 | 没有 `--approver` 的人类门控,review 形同虚设 |
| 装好的 Skill 到底在干啥没人说得清 | 文档和实际行为漂移,出问题没审计 |
| 想跟 OMC / OMX 共存 | 锁死单一编排器就丢掉了可组合性 |

TaiyiForge 对每个问题的回答都在 [§2 方案](#2--方案)。

---

## 2 · 方案

**一条九阶段工件契约** + **28 条 v28 顶栏 slash + 6 个 umbrella** + **一套 `/taiyi:*`
词汇表**,在四套 AI 终端里行为完全一致。

> **v28 = 推荐命名 + 顶栏收敛。IDE 菜单已裁剪为 28 条（v0.24），设 `TAIYI_FORGE_ALL_PROMPTS=1` 恢复全量。详见 [canonical-commands.md](docs/taiyi/canonical-commands.md)。**

TaiyiForge 不发明新标准——它把 Harness · OpenSpec · GStack · Superpowers · OMO ·
Spec-Kit **编排成一台状态机**。装了什么用什么,其余自动跳过。

### 2.1 · 九阶段主流程

一个 change = 一个 slug,顺序执行,产出固定。**人类门控**必须带 `--approver`
才能放行。

| # | 阶段 | 类别 | Skill | 产出 | 备注 |
|---|------|------|-------|------|------|
| 1 | change | 人类门控 | `taiyi-change` | `CHANGE.md` | 3-5 段方案 + 范围 |
| 2 | requirement | 自动 | `taiyi-requirement` | `REQUIREMENT.md` | 验收标准 + AC 复选框 |
| 3 | design | 人类门控 | `taiyi-design` | `DESIGN.md` | ≥2 方案对比 + 决策 |
| 4 | ui-design | 自动 | `taiyi-ui-design` | `UI-DESIGN.md` | 仅触 UI 的 change |
| 5 | task | 自动 | `taiyi-task` | `TASK.md` | 切成可独立 PR 的片段 |
| 6 | dev | 自动 | `taiyi-dev` | TDD 测试 + 最小实现 | **强制 TDD**——先红后绿 |
| 7 | test | 自动 | `taiyi-test` | `TEST.md` | 留摘要,E2E 跑 CI |
| 8 | review | 人类门控 | `taiyi-review` | `REVIEW.md` | 跨 AI 评审 + 高危必改 |
| 9 | integration | 自动 | `taiyi-integration` | `CHANGELOG.md` 合并 | 交付门控: `audit` + `deliveryVerifyCmd` |
| — | archive | 收尾 | `taiyi-integration` | `.taiyi/archive/` | 九阶段全过后才执行 |

完整命令表 → **[canonical-commands.md](docs/taiyi/canonical-commands.md)** · 工件布局 → **[artifact-layout.md](docs/taiyi/artifact-layout.md)**

### 2.2 · v28 顶栏命令(28 条)

真源: [canonical-commands.md](docs/taiyi/canonical-commands.md) → `canonical_v28`。
旧 slash 仍可用,见 [Legacy 兼容](#legacy-兼容)。

| # | 分组 | Slash | 用途 |
|---|------|-------|------|
| 1–6 | 主链 | `new` · `status` · `write` · `continue` · `apply` · `archive` | 日常最短路径 |
| 7–10 | 会话 | `handoff` · `resume` · `cancel` · `list` | 跨会话 |
| 11–13 | 排查 | `doctor` · `audit` · `verify` | 自检 + 交付门控 |
| 14–17 | 交付 | `commit` · `ship` · `land` · `release` | gstack 交付链 |
| 18–19 | 路由 | `gstack <skill>` · `sp <skill>` | 外部 harness 路由 |
| 20–22 | 阶段捷径 | `explore` · `tdd plan\|dev` · `flow` | 跳过九阶段 |
| 23–28 | **Umbrellas(6)** | `token …` · `test …` · `review …` · `diagram …` · `mode …` · `workflow …` | 领域多子命令 |

**日常最短路径**:

```text
/taiyi:new → /taiyi:write → /taiyi:continue → /taiyi:apply → … → /taiyi:commit → /taiyi:continue integration → /taiyi:archive
```

**Umbrella 速查**(完整地图见 [canonical-commands.md §伞形命令·子命令地图](docs/taiyi/canonical-commands.md)):

| Umbrella | 子命令 | 数量 |
|----------|-------|----:|
| `/taiyi:token` | `status` · `record` · `scan` · `compress` | 4 |
| `/taiyi:test` | `smoke` · `e2e` · `qa` · `ui` · `security` | 5 |
| `/taiyi:review` | `loop` · `check` · `health` · `gstack` | 4 |
| `/taiyi:diagram` | `pipeline` · `c4` · `arch` · `render` · `flow` | 5 |
| `/taiyi:mode` | `ralph` · `autopilot` · `daemon` · `team` · `ultrawork` · `agent` · `step` · `stop` · `list` · `keyword` · `preflight` | 11 |
| `/taiyi:workflow` | `plan` · `ralplan` · `loop` · `check` · `run` · `sync` · `ccg` · `sciomc` · `deepinit` · `remember` · `ultraqa` | 11 |

### 2.3 · Legacy 兼容

旧 slash & CLI **仍可用**——完整列表见
[canonical-commands.md §Legacy 兼容](docs/taiyi/canonical-commands.md)。不要在
v28 umbrella 之外再添新的顶栏重复。

| 旧 / legacy | v28 现用 |
|------|----------|
| `/taiyi:pause` | `/taiyi:handoff` |
| `/taiyi:state` · `/taiyi:state-read` | `/taiyi:status` |
| `/taiyi:next` · `/taiyi:done` | `/taiyi:status` + `/taiyi:continue` |
| `/taiyi:change` … `/taiyi:integration` | `/taiyi:write` |
| `/taiyi:ralph` 等 OMC | `/taiyi:mode ralph` |
| `npx taiyi new` · `npx taiyi walkthrough` | `/taiyi:new` · `/taiyi:flow help` |

---

## 3 · 证据

### 3.1 · 一套 Skill,四端共享

一条 `node scripts/taiyi-forge.sh install --all` 同步到四端,缺哪端就跳过哪端。
28 条 v28 顶栏 slash 相同,`taiyi-*` Skill 相同——每端的聊天语法和 MCP 暴露不同:

| Harness | 聊天入口 | 引擎入口 | MCP | Hook / 关键词 | 详见 |
|---------|---------|---------|-----|---------------|------|
| **Claude Code** | `/taiyi:new … /taiyi:archive` + Skill + `~/.claude/commands/taiyi-*.md` | Agent 跑 Bash | `taiyi_doctor` · `taiyi_audit` | keyword hook | [control-plane.md §四端对照](docs/taiyi/control-plane.md) |
| **Codex** | `$taiyi-new` … `$taiyi-archive`(`prompts/taiyi-*.md`——**不是** `/taiyi:*`) | Agent 跑 `scripts/taiyi-forge.sh` | 无(靠 shell) | `codex-keyword-preflight.mjs` + `developer_instructions`(`~/.codex/config.toml`) | [control-plane.md §Codex](docs/taiyi/control-plane.md) |
| **Cursor** | `/taiyi:new … /taiyi:status` + `taiyiforge.mdc` 规则 + `~/.cursor/commands/taiyi-*.md` | Agent 终端 / MCP | `taiyi_doctor` · `taiyi_audit` | keyword hook | [mcp-setup.md](docs/taiyi/mcp-setup.md) |
| **OpenCode** | `taiyi_new` / `taiyi_*` 插件工具 + `~/.config/opencode/commands/taiyi-*.md` | plugin + `/taiyi-*` 斜杠 | (插件内置) | 插件自管 | [control-plane.md §OpenCode](docs/taiyi/control-plane.md) |

> **Codex 注意**:聊天入口是 `$taiyi-*` 关键词(不是 `/taiyi:*`),通过
> `codex-keyword-preflight.mjs` 和 `developer_instructions` 路由。见
> [control-plane.md](docs/taiyi/control-plane.md)。

### 3.2 · 聊天轨 vs 引擎轨

| 表面 | 谁在用 | 干啥 | 例子 |
|------|-------|------|------|
| **聊天 slash** | 开发者 / Agent | 写工件、跑 TDD、加载专用 Skill | `/taiyi:write` · `/taiyi:apply` · `/taiyi:tdd dev` |
| **引擎 CLI** | Agent / CI(代用户跑) | 校验工件、放行门控、推进阶段 | `npx taiyi continue <slug>` · `npx taiyi complete <slug> change --approver "…"` |
| **Shell 入口** | Agent / CI | 等价于 CLI;安装到消费项目后写入 | `scripts/taiyi-forge.sh status --json --compact` |
| **MCP** | Cursor 等 | 只读排障 | `taiyi_doctor` · `taiyi_audit` |

**原则**:用户只说 `/taiyi:*`;**绝不**让用户手打 `taiyi-forge.sh`。Agent 读
`status --json --compact` 的 `engineTruth`;不要把整份工件塞进聊天。

### 3.3 · 架构一图

```
┌─────────────────────────────────────────────────────────────┐
│  入口: taiyi CLI · taiyi-forge.sh · OpenCode plugin · MCP    │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  workflow-engine — 意图分析 · token 预算 · 路由 · 门控 │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  .taiyi/changes/<slug>/  — CHANGE … CHANGELOG(真源)         │
└─────────────────────────────────────────────────────────────┘
   聊天加载 taiyi-* Skill 写工件 ↑   ↓ 引擎校验并推进阶段
```

- 代码布局 → **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
- C4 源 → **[docs/c4/](docs/c4/)**
- 视觉海报(README 顶部)→ [docs/diagrams/visual/](docs/diagrams/visual/)

---

## 4 · 快速上手

> **零构建安装**：v0.24.0 起支持 `npx taiyi-forge-install --all` 一键装到四端，无需 clone 仓库。源码安装仍可用。

### 方式 A · 一行安装（推荐,v0.24+）

```bash
npx taiyi-forge-install --all          # 一键装到四端 + 可选铁三角
npx taiyi-forge-install --cursor       # 只装到 Cursor
npx taiyi-forge-install --claude --opencode

# 装全量 prompt（默认只同步 v28 28 条顶栏）：
TAIYI_FORGE_ALL_PROMPTS=1 npx taiyi-forge-install --all
```

### 方式 B · 源码安装

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build && npm test
node scripts/taiyi-forge.sh install --all
```

### 方式 C · 跑通示例工程（零安装，快速体验）

```bash
cd examples/commands-smoke
npm install
npm run chat-demo          # 聊天动词: new / status / check / continue
npm run walkthrough-e2e    # 九阶段 shell E2E + 铁三角
# /taiyi:doctor           # 工作区 + 安装自检(聊天 slash)
```

| 示例 | 用途 |
|------|------|
| [examples/full-flow-demo](examples/full-flow-demo/README.md) | 九阶段 + slash E2E |
| [examples/commands-smoke](examples/commands-smoke/) | 命令冒烟测试 |
| [examples/browser-e2e-smoke](examples/browser-e2e-smoke/) | CI 模板 |
| [examples/verification-suite](examples/verification-suite/) | 极简集成验证 |

> 想用 `npm install oh-my-taiyiforge`？v0.24 已发布到 npm，直接装即可。

### 方式 D · 第一个 change（5 分钟）

```bash
# 推荐入口: 自动 slug + 引擎引导
npx taiyi walkthrough
npx taiyi new "优化登录流程"     # 写到 .taiyi/changes/<slug>/
npx taiyi status                   # 当前阶段 + 推荐 Skill + 下一步

# 编辑 .taiyi/changes/<slug>/CHANGE.md,然后:
npx taiyi complete <slug> change --approver "你的名字"   # 人类门控
npx taiyi continue <slug>                                # 自动门控

# 在聊天里(OpenCode / Claude / Cursor——Codex 用 `$taiyi-*` 关键词):
/taiyi:new "<feature title>"              # 落 CHANGE.md 模板
/taiyi:status                             # 当前阶段 + 推荐 Skill + 下一步
/taiyi:write                              # 写当前阶段工件(覆盖 9 阶段)
/taiyi:continue --approver "你的名字"     # 人类门控(change / design / review)
/taiyi:apply                              # dev/test harness checklist
/taiyi:commit                             # dev 后带 Taiyi-Change trailer 的提交
/taiyi:archive                            # 九阶段全过后归档

# 常用 umbrella 一行:
/taiyi:doctor                             # 安装 + 工作区自检
/taiyi:token compress <slug>              # 长会话 → CONTEXT-COMPACT.md
/taiyi:test smoke                         # Playwright 内置冒烟
/taiyi:flow bug <slug>                    # 小修复走 lite 路径
```

就这些。**阶段顺序、工件模板、门控校验全是引擎的活**。你只管写 Markdown 和代码。

Agent 排障:

```bash
scripts/taiyi-forge.sh doctor --json --compact
scripts/taiyi-forge.sh audit --json --compact
```

---

## 5 · 参考

### 5.1 · 文档导航

| 文档 | 覆盖什么 | 何时读 |
|------|---------|-------|
| [docs/QUICKSTART.md](docs/QUICKSTART.md) | 5 分钟走通 | 首次安装 |
| [docs/USAGE.md](docs/USAGE.md) | 场景 · 日常节奏 · 交付链 | 走通之后 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构概览 + 代码布局 | 改引擎 / 排障 |
| [docs/taiyi/canonical-commands.md](docs/taiyi/canonical-commands.md) | v28 slash 命令表 | 查命令 |
| [docs/taiyi/control-plane.md](docs/taiyi/control-plane.md) | Agent 纪律 + token 纪律 | 给 Agent 做 onboarding |
| [docs/taiyi/full-oss-flow.md](docs/taiyi/full-oss-flow.md) | Superpowers + 全插件演示 | 想看完整端到端 |
| [docs/taiyi/integrations.md](docs/taiyi/integrations.md) | 铁三角 + 插件集成 | 装可选件 |
| [AGENTS.md](AGENTS.md) | Agent 的读态入口 | 配置 Agent |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献指南 | 开 PR 之前 |
| [CHANGELOG.md](CHANGELOG.md) | 发布说明 | 查更新 |
| [docs/diagrams/demo.gif](docs/diagrams/demo.gif) | 真实终端录制(27s) | 快速感受引擎 |
| [README.en.md](README.en.md) | English | English users |

### 5.2 · 开发与验证

**贡献者克隆:**

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build && npm test
node scripts/taiyi-forge.sh install --all
```

**常用命令:**

```bash
npm test               # Vitest 契约 + 九阶段 E2E
npm run test:watch     # 监听模式
npm run build          # TypeScript → dist/
npm run dogfood        # 根仓库自吃狗粮演示
npm run ci:platforms   # 四端冒烟(opencode/claude/codex/cursor)
npm run check:docs     # doc-vs-commands.yaml 同步校验
```

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)——平台冒烟跑 4 × ubuntu
矩阵。

### 5.3 · 路线图与状态

| 版本 | 状态 | 关键里程碑 |
|------|------|----------|
| v0.23.0 | ✅ 已发布 | **canonical v28**: 28 顶栏 slashes + 6 umbrellas(`token`/`test`/`review`/`diagram`/`mode`/`workflow`) + `skill-fusion-principles.md` + `validateV28CatalogSync` gate |
| v0.24.0 | ✅ 已发布 | 首次 npm 发布 · `npx taiyi-forge-install` 零构建安装 · README v28 收敛重写 · IDE 菜单裁剪为 28 条（umbrella Phase 2） |
| v1.0.0 | ⏳ 计划 | 锁定 9 阶段 API · 四端 parity · 外部案例收集 |

**已就绪**: 完整九阶段流水线 · 四端共享 Skill · 强制 TDD · token 压缩 · 平台冒烟 CI · 零构建一行安装(v0.24)
**未就绪**: 生产级 SLA · 完整 i18n

### 5.4 · 社区与贡献

- 🐛 **报告 Bug**: [GitHub Issues](https://github.com/Dong90/oh-my-taiyiforge/issues/new) · `bug` 标签
- 💡 **想法 / RFC**: [Discussions](https://github.com/Dong90/oh-my-taiyiforge/discussions)
- 🔧 **开 PR**: 先读 [CONTRIBUTING.md](CONTRIBUTING.md);`npm test` + `npm run check:docs` 必须绿
- ⭐ **Star / Watch**: 点个星,下次发布就收到通知
- 🧵 **Codex 用户**: 搜 `$taiyi-*` 关键词;四端入口决策树在 [docs/taiyi/invoke.yaml](docs/taiyi/invoke.yaml)

行为准则: 遵循 [Contributor Covenant](https://www.contributor-covenant.org/) 精神——批评想法,不批评人。

### 5.5 · 许可证

[MIT](LICENSE) © 2026 TaiyiForge contributors

### 5.6 · 致谢

灵感来自: [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) · [oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex) · Harness Engineering · OpenSpec · GStack · Superpowers · OMO · Spec-Kit。
