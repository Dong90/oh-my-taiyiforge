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

## 全自动模式（对齐架构图）

```bash
npx taiyi init my-feature --auto --title "My Feature"
npx taiyi harness my-feature    # 铁三角 → 辅助 → 主流程 有序清单
```

在 Cursor 加载 **`taiyi-orchestrator`** Skill，让 Agent 按清单自动执行 Superpowers / gstack / taiyi 辅助，每步铁三角后：

```bash
npx taiyi harness-check my-feature superpowers/brainstorming
```

`complete` 会校验打卡与辅助工件。全局默认 auto：

```bash
export TAIYI_AUTO_HARNESS=1
```

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
npm install && npm test && npm run dogfood
```

## 下一步阅读

- [架构](./ARCHITECTURE.md)
- [OpenCode 安装](./opencode-setup.md)
- [铁三角集成](./taiyi/integrations.md)
