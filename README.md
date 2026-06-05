# oh-my-taiyiforge · TaiyiForge

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**TaiyiForge** — 将六大工程规范转化为 AI 可执行工作流：九阶段文档驱动研发、双门禁、四端统一控制面。

> 聊天里写工件，Agent 代跑引擎；对齐 **OpenSpec** 命令风格，融合 **Superpowers / gstack / OpenSpec** 铁三角。

[5 分钟快速开始 →](./docs/QUICKSTART.md) · [完整演示 →](./examples/minimal-project/README.md)

---

## 架构总览

![TaiyiForge 架构图 — 六大工程规范 × 15 Skill × 受控交付](./docs/taiyiforge-architecture.png)

上图从左到右：

| 区域 | 内容 |
|------|------|
| **工件体系** | `.taiyi/changes/<slug>/` 下 CHANGE → CHANGELOG 等 Markdown + ADR |
| **核心引擎** | 统一入口、意图分析、前置校验、路由决策、Harness 编排、状态追踪、CI 验证 |
| **九阶段主流程** | change → requirement → design → ui-design → task → dev → test → review → integration |
| **双门禁** | 人工审批门 + 质量五维门（`--auto` 模式含 harness-check） |
| **15 Skill** | 9 主流程 + 5 辅助 + 1 编排（`taiyi-orchestrator`） |

### 六大工程规范（顶部）

| 规范 | 在 TaiyiForge 中的落点 |
|------|------------------------|
| **Harness Engineering** | `init --auto` + harness 清单 + complete 门禁 |
| **OpenSpec** | 可选：`sync-openspec` / `archive`（未装自动跳过） |
| **GStack** | design / review / integration 铁三角（plan-eng-review、review、document-release） |
| **Superpowers** | change / dev / test 铁三角（brainstorming、TDD、verification） |
| **OMO** | change / design / review 人工门 + `approver` 记录 |
| **Spec-Kit** | `templates/` 模板 + `quality-gate` 五维检查清单（内置，非独立包） |

真源目录：**`.taiyi/changes/<slug>/`**。OpenSpec 为可选镜像/归档目标，与 Spec-Kit 不冲突。

---

## 快速开始

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all    # Cursor / Claude / Codex / OpenCode
npx taiyi doctor                 # 四端 Skills + 控制面自检
```

本地开发：

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge && npm install && npm test
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

辅助（按需）：`/taiyi:doctor` · `/taiyi:list` · `/taiyi:check` · `/taiyi:sync` · `/taiyi:run`

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
- 双门禁：人工审批 + 质量五维
- 铁三角：OpenSpec / Superpowers / gstack 分阶段 harness 推荐
- `npm test` — 70+ 契约测试含九阶段 E2E
- CI 模板：`examples/ci/github-actions/`

---

## 文档

| 文档 | 说明 |
|------|------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 架构与代码布局 |
| [QUICKSTART.md](./docs/QUICKSTART.md) | 5 分钟上手 |
| [integrations.md](./docs/taiyi/integrations.md) | 铁三角集成说明 |
| [control-plane.md](./docs/taiyi/control-plane.md) | OMX 风格控制面 |
| [minimal-project](./examples/minimal-project/README.md) | 安装到执行全流程 |

---

## 开源

MIT · [贡献指南](./CONTRIBUTING.md)
