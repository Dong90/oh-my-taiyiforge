# TaiyiForge 快速开始

5 分钟跑通 **OpenCode / Claude / Codex / Cursor** 任一端。

## 安装

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all
npx taiyi doctor    # 确认四端 skills + OpenCode plugin
```

| 端 | 验证 |
|----|------|
| OpenCode | `opencode.json` 含 `oh-my-taiyiforge`；重启后可见 `taiyi_*` 工具 |
| Claude | `ls ~/.claude/skills/taiyi-change` |
| Codex | `ls ~/.codex/skills/taiyi-change` |
| Cursor | `ls ~/.cursor/skills/taiyi-change` 与 `~/.cursor/rules/taiyiforge.mdc` |

按需安装：

```bash
npx taiyi-forge-install --cursor
npx taiyi-forge-install --claude --cursor
TAIYI_FORGE_INSTALL=opencode,cursor npm install oh-my-taiyiforge
```

## 第一个变更

```bash
mkdir demo && cd demo
npm init -y
npm install oh-my-taiyiforge

npx taiyi walkthrough       # 首次体验（自动 init 演示变更）
# 或手动：
npx taiyi init my-first --title "My First Change"
npx taiyi next my-first     # 人类可读下一步（推荐）
```

编辑 `.taiyi/changes/my-first/CHANGE.md` 后：

```bash
npx taiyi complete my-first change
npx taiyi next my-first
npx taiyi list
```

## 聊天命令（OpenSpec 风格）

| 命令 | 用途 |
|------|------|
| `/taiyi:new 名称` | 新建变更 |
| `/taiyi:status` | 阶段进度 + **意图分析** + 工件就绪 |
| `/taiyi:continue` | 规划阶段推进（写完工件后） |
| `/taiyi:apply` | dev / test 实现 |
| `/taiyi:check` | auto 模式 harness 清单 |
| `/taiyi:explore` | change 头脑风暴（→ Superpowers brainstorming） |
| `/taiyi:archive` | 九阶段完成后归档 |

Codex 用 `$taiyi-new` 等；完整列表见 [`docs/taiyi/commands.yaml`](./taiyi/commands.yaml)。

**意图分析**：`status` / `guide` 会显示从 CHANGE/REQUIREMENT 推断的「模块≈… · 含/无 UI · 测试层级≈… · 复杂度 …」。

## 全自动模式（对齐架构图）

```bash
npx taiyi init my-feature --auto --title "My Feature"
npx taiyi harness my-feature    # 铁三角 → 辅助 → 主流程 有序清单
```

在 Cursor 加载 **`taiyi-orchestrator`** Skill，让 Agent 按清单自动执行 Superpowers / gstack / taiyi 辅助，每步**必选**铁三角后：

```bash
npx taiyi harness-check my-feature superpowers/brainstorming
```

`complete` 会校验必选打卡与辅助工件。全局默认 auto：

```bash
export TAIYI_AUTO_HARNESS=1
```

### optional 铁三角（不打卡也可 complete）

| 阶段 | 钩子 | 说明 |
|------|------|------|
| requirement | OpenSpec | 未装 CLI 自动跳过 |
| ui-design | gstack `plan-design-review` | 纯 API 可跳过 |
| test | gstack `qa` | CLI-only 可跳过 |
| integration | OpenSpec archive | 可选归档 |

harness 清单里标 **(可选)** 的项不会阻塞 `--auto` 过关。详见 [workflow §可选层](./taiyi/workflow.md) 与 [GAP-CLOSURE](./GAP-CLOSURE.md)。

## 完整演示（minimal-project）

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build && npm test

cd examples/minimal-project
npm install
npm run walkthrough    # 九阶段 shell 全流程 + 铁三角
npm run chat-demo      # 聊天动词：new / status / check / continue
```

本地链 `TAIYI_FORGE_ROOT` 开发时务必先 **`npm run build`**，否则 `dist/` 与源码不一致（optional 钩子等会失效）。

## Profile（按变更类型）

| Profile | 说明 |
|---------|------|
| `full` | 九阶段（默认） |
| `api` | 跳过 `ui-design`（纯后端/API） |
| `lite` | 五阶段：change → requirement → dev → test → integration |

```bash
npx taiyi init fix-bug --profile lite
npx taiyi init new-api --profile api --strict-dev
```

## 辅助 Skill

```bash
npx taiyi assess my-first          # 自动读 CHANGE 推断复杂度
npx taiyi mark-aux my-first taiyi-intel-scan   # 标记辅助 Skill 已完成
```

`CONTEXT.md` 可从 [`templates/CONTEXT.md`](../templates/CONTEXT.md) 起步，由 **taiyi-intel-scan** 填写。

## OpenCode 对话内

```
taiyi_init slug=demo-feature title="Demo" profile=full
taiyi_guide slug=demo-feature
taiyi_complete slug=demo-feature phase=change approver=you
taiyi_mark_aux slug=demo-feature skill=taiyi-health
```

## 人工门（可配置）

默认仅 **change / design / review** 需明确审批者。覆盖：

```bash
export TAIYI_HUMAN_GATE_PHASES=change,requirement,design,review
```

## 冒烟测试（维护者）

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build && npm test && npm run dogfood
```

## 下一步阅读

- [架构](./ARCHITECTURE.md)
- [架构审计补齐对照](./GAP-CLOSURE.md)
- [OpenCode 安装](./opencode-setup.md)
- [铁三角集成](./taiyi/integrations.md)
- [minimal-project 逐步清单](../examples/minimal-project/WALKTHROUGH.md)
