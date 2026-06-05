# TaiyiForge 快速开始

5 分钟跑通 **OpenCode / Claude / Codex / Cursor** 任一端。

## 安装

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all
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

npx taiyi init my-first --title "My First Change"
npx taiyi guide my-first    # 含复杂度 + 辅助 Skill 推荐
```

按 `guide.nextAction` 编辑 `.taiyi/changes/my-first/CHANGE.md`，然后：

```bash
npx taiyi complete my-first change
npx taiyi guide my-first
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
