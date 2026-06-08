# oh-my-taiyiforge · TaiyiForge

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**TaiyiForge** — 将六大工程规范转化为 AI 可执行工作流：九阶段文档驱动研发、双门禁、四端统一控制面。

> 聊天里写工件，Agent 代跑引擎；对齐 **OpenSpec** 命令风格，融合 **Superpowers / gstack / OpenSpec** 铁三角。

[5 分钟快速开始 →](./docs/QUICKSTART.md) · [完整演示 →](./examples/minimal-project/README.md) · [**完整开源流程** →](./docs/taiyi/full-oss-flow.md) · [Superpowers 主轴 →](./docs/taiyi/superpowers-flow.md)

---

## 架构总览

<p align="center">
  <img
    src="./docs/taiyiforge-architecture.png"
    alt="TaiyiForge 架构图 — 六大标准 × 中心引擎 × 九阶段 × OMC 原生控制面 × 三重门禁"
    width="1200"
  />
</p>

> 可编辑真源：[docs/taiyiforge-architecture.svg](./docs/taiyiforge-architecture.svg)（v0.22）。README 展示用 **4×** 高清位图（7200×8400）：[taiyiforge-architecture.png](./docs/taiyiforge-architecture.png)。重生成：`python3 scripts/generate-architecture-svg.py`

上图分区说明：

| 区域 | 内容 |
|------|------|
| **工件体系** | `.taiyi/changes/<slug>/` 真源；`adr/`、`health-report.md`；integration 后合并**根 CHANGELOG.md**；消费方 `scripts/taiyi-forge.sh` |
| **核心引擎** | 意图分析、profile 路由、Harness、Token；**0.22** integration 前 audit+交付门、archive 前 auto sync-openspec、`verify`/`audit` |
| **聊天命令** | 四动词 `new/status/continue/apply/archive`；排查 **doctor · audit · verify · health** |
| **九阶段** | full 9 · api 8（跳过 ui-design）· lite 5；`continue`/`apply` 分工 |
| **三门禁** | 人工门 + 质量五维 + **交付门**（git commit + 干净工作区）；`--auto` harness-check |
| **17 Skill** | 9 主流程 + 6 辅助 + orchestrator/forge/ultrawork |
| **OMC 原生** | ralph/autopilot/team/ultrawork · 29 agent · workflow 斜杠 · keyword hook · MCP state_* |

### 六大工程规范（顶部）

| 规范 | 在 TaiyiForge 中的落点 |
|------|------------------------|
| **Harness Engineering** | `init --auto` + harness 清单 + complete 门禁 |
| **OpenSpec** | 可选：`sync-openspec` / `archive`（未装自动跳过） |
| **GStack** | design / ui-design（可选 plan-design-review）/ test（可选 qa）/ review / integration 铁三角 |
| **Superpowers** | change / **task+dev TDD** / test 铁三角（brainstorming、test-driven-development、verification） |
| **OMO** | change / design / review 人工门 + `approver` 记录 |
| **Spec-Kit** | `templates/` 模板 + `quality-gate` 五维检查清单（内置，非独立包） |

真源目录：**`.taiyi/changes/<slug>/`**。OpenSpec 为可选镜像/归档目标，与 Spec-Kit 不冲突。

---

## 快速开始

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all    # Cursor / Claude / Codex / OpenCode + 铁三角依赖
npx taiyi doctor                 # 四端 Skills + deps-* 自检
```

本地开发：

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge && npm install && npm run build && npm test
npx taiyi-forge-install --all
```

---

## 聊天命令（OpenSpec 风格）

主流程（Cursor `/taiyi:*`，Codex `$taiyi-*`）：

```
/taiyi:new 功能名          # 新建变更
/taiyi:status              # 当前第几阶段、该加载哪个 Skill
/taiyi:continue            # 规划/收尾：写完工件后推进（每阶段一次）
/taiyi:apply               # dev / test 实现
/taiyi:archive             # 九阶段完成后归档
```

辅助（按需）：`/taiyi:doctor` · `/taiyi:audit` · `/taiyi:verify` · `/taiyi:health` · `/taiyi:list` · `/taiyi:check` · `/taiyi:sync` · `/taiyi:run` · `/taiyi:explore` · `/taiyi:loop` · `/taiyi:review-loop` · `/taiyi:review-check` · `/taiyi:token …`

详见 [workflow.md](./docs/taiyi/workflow.md) · [commands.yaml](./docs/taiyi/commands.yaml)

引擎（Agent / CI 内部代跑）：

```bash
scripts/taiyi-forge.sh new "功能名"
scripts/taiyi-forge.sh status
scripts/taiyi-forge.sh continue
scripts/taiyi-forge.sh apply
scripts/taiyi-forge.sh doctor
```

---

## 九阶段

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

辅助 Skill：`taiyi-intel-scan` · `taiyi-architect` · `taiyi-restyle` · `taiyi-evolve` · `taiyi-health`  
全自动编排：加载 **`taiyi-orchestrator`**（配合 `init --auto`）

---

## 四端安装

| 平台 | 配置位置 |
|------|----------|
| **OpenCode** | `opencode.json` → `"plugin": ["oh-my-taiyiforge"]` |
| **Claude Code** | `~/.claude/skills/taiyi-*` + CLAUDE.md 控制面 |
| **Codex** | `~/.codex/skills/taiyi-*` + `$taiyi-new` 等 prompts |
| **Cursor** | `~/.cursor/skills/taiyi-*` + `taiyiforge.mdc` 规则 |

```bash
npx taiyi-forge-install --cursor           # 仅 Cursor
npx taiyi-forge-install --claude --cursor  # 组合安装
```

OpenCode 可与 **oh-my-openagent** 并列：

```json
{
  "plugin": ["oh-my-openagent", "oh-my-taiyiforge"]
}
```

---

## 一键演示

```bash
cd examples/minimal-project
npm install
npm run walkthrough    # 九阶段 + 铁三角打卡 + CI verify
```

或仓库根目录：`npm run dogfood`

---

## 特性

- 九阶段 + `taiyi-*` Skill，四动词遥控器（不合并阶段）
- 三门禁：人工审批 + 质量五维 + integration **交付门**（git）
- 铁三角：OpenSpec / Superpowers / gstack 分阶段 harness 推荐
- `npm test` — 145 契约测试含九阶段 E2E
- **Integration 交付门** — git 仓库须 commit + 干净工作区才能 complete integration（[delivery-gate.md](./docs/taiyi/delivery-gate.md)）
- **Dogfood 修复演示** — legacy state / scope 门禁 / commit 方案（[examples/dogfood-showcase](./examples/dogfood-showcase/README.md)）
- **排查命令** — `/taiyi:audit` 流程/交付 · `/taiyi:verify` CI 工件 · `/taiyi:health` review 前基线
- **0.22 自动串联** — complete integration 前 audit · archive 前 sync-openspec · 项目 `scripts/taiyi-forge.sh` wrapper
- CI 模板：`examples/ci/github-actions/`

---

## 文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 架构与代码布局 |
| [QUICKSTART.md](./docs/QUICKSTART.md) | 5 分钟上手 |
| [GAP-CLOSURE.md](./docs/GAP-CLOSURE.md) | 架构审计 7 项 ↔ 实现 ↔ 验证 |
| [integrations.md](./docs/taiyi/integrations.md) | 铁三角集成说明 |
| [control-plane.md](./docs/taiyi/control-plane.md) | OMX 风格控制面 |
| [minimal-project](./examples/minimal-project/README.md) | 安装到执行全流程 |

---

## 开源

MIT · [贡献指南](./CONTRIBUTING.md)
