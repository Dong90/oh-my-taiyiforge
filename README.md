# oh-my-taiyiforge · TaiyiForge

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**TaiyiForge** — 九阶段文档驱动研发工作流。  
安装方式与 **Superpowers / oh-my-openagent** 同类：**OpenCode 走 `plugin` 数组**，**Claude / Codex / Cursor 走 `taiyi-*` Skills**。

[5 分钟快速开始 →](./docs/QUICKSTART.md)

## 四端安装（对齐 Superpowers / oh-my-openagent）

| 平台 | 一条命令之后 | 配置位置 |
|------|----------------|----------|
| **OpenCode** | `postinstall` 写入 `plugin` + 同步 skills；`--opencode` 还会在 `~/.config/opencode` 执行 `npm install` | `opencode.json` → `"plugin": ["oh-my-taiyiforge"]` |
| **Claude Code** | `postinstall` 同步 skills + **CLAUDE.md 控制面** | `~/.claude/skills/taiyi-*` |
| **Codex** | `postinstall` 同步 skills + 合并 `AGENTS.md` + **`$taiyi-forge` prompt** | `~/.codex/skills/taiyi-*` · `~/.codex/prompts/taiyi-forge.md` |
| **Cursor** | `postinstall` 同步 skills + **`taiyiforge.mdc` 规则** | `~/.cursor/skills/taiyi-*` |

### 一键（推荐）

```bash
npm install oh-my-taiyiforge
# 或本地开发：
cd oh-my-taiyiforge && npm install && npx taiyi-forge-install --all
```

`npm install` 的 **postinstall** 默认会：同步 **OpenCode / Claude / Codex / Cursor** 四端 skills，并把 `oh-my-taiyiforge` 写入 `~/.config/opencode/opencode.json` 的 `plugin` 数组（与 Superpowers 相同方式）。

按需安装（可组合）：

```bash
npx taiyi-forge-install --all              # 默认，四端全装
npx taiyi-forge-install --cursor           # 仅 Cursor
npx taiyi-forge-install --claude --cursor  # Claude + Cursor
TAIYI_FORGE_INSTALL=opencode,cursor npm install oh-my-taiyiforge
```

详见 [docs/opencode-setup.md](./docs/opencode-setup.md)

### OpenCode 示例配置

```json
{
  "plugin": [
    "oh-my-openagent",
    "oh-my-taiyiforge"
  ]
}
```

安装包后 OpenCode 会加载 **16 个工具**（含 `taiyi_harness`、`taiyi_harness_check`、`taiyi_walkthrough` 等）。`init --auto` 开启全自动编排。

### OMX 风格三端（Cursor / Codex / Claude）

聊天里用 **OpenSpec 风格**命令；**九阶段不变**，见 [workflow.md](./docs/taiyi/workflow.md)。

```
/taiyi:new 功能名
/taiyi:status              # 当前 3/9、该用哪个 Skill
/taiyi:continue            # 每阶段写完工件后推进（要用多次）
/taiyi:apply               # dev/test 实现
/taiyi:archive
```

Codex：`$taiyi-new`、`$taiyi-continue`、`$taiyi-apply`、`$taiyi-archive`。详见 [docs/taiyi/commands.yaml](./docs/taiyi/commands.yaml) 与 [control-plane.md](./docs/taiyi/control-plane.md)。

引擎（CI / Agent 内部）：

```bash
scripts/taiyi-forge.sh new 功能名
scripts/taiyi-forge.sh continue
scripts/taiyi-forge.sh apply
scripts/taiyi-forge.sh doctor
```

四端 CI 模板：`examples/ci/github-actions/` · 文档：`docs/ci/README.md`

工件落在项目目录 **`.taiyi/changes/<slug>/`**。

## CLI（任意目录）

```bash
cd your-project
taiyi-forge init my-feature
# 或在本仓库开发：
scripts/taiyi-forge.sh init my-feature
```

## 特性

- 九阶段 + `taiyi-*` Skill（非 `flow-*`）
- 双门禁：人工审批 + 质量五维
- `taiyi-dev` 阶段 TDD
- `npm test` — 引擎与 OpenCode 处理器契约测试（含九阶段 E2E）
- `npm run dogfood` — 本地跑通 `.taiyi/changes/<slug>/` 全流程（默认 `dogfood-demo`）
- `templates/` — 九阶段工件模板；`skills/taiyi-*` — 可执行 Skill 正文（v0.4+）

## 文档

- [架构](./docs/ARCHITECTURE.md)
- [OpenCode 安装](./docs/opencode-setup.md)
- [铁三角集成（OpenSpec / Superpowers / gstack）](./docs/taiyi/integrations.md)
- [双端 agents.yaml](./docs/taiyi/agents.yaml)
- [贡献](./CONTRIBUTING.md)

## 开源

MIT · 发布前将 `package.json` 的 `repository.url` 改为你的 GitHub 地址。
