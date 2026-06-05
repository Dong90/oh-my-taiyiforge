# TaiyiForge 快速开始

5 分钟跑通 **OpenCode / Claude / Codex** 三端之一。

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

## 第一个变更

```bash
mkdir demo && cd demo
npm init -y
npm install oh-my-taiyiforge

npx taiyi init my-first --title "My First Change"
npx taiyi guide my-first
```

按 `guide.nextAction` 编辑 `.taiyi/changes/my-first/CHANGE.md`，然后：

```bash
npx taiyi complete my-first change
npx taiyi guide my-first   # 进入 requirement …
```

## OpenCode 对话内

```
taiyi_init slug=demo-feature title="Demo"
taiyi_guide slug=demo-feature
taiyi_complete slug=demo-feature phase=change
```

## 冒烟测试（维护者）

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm test && npm run dogfood
```

## 与铁三角并存

- **OpenSpec**：`taiyi archive <slug>`（见 [integrations.md](./taiyi/integrations.md)）
- **Superpowers / gstack**：`taiyi guide` 返回的 `harness.hooks` 按阶段推荐外部 Skill
- 工件真源在 `.taiyi/changes/<slug>/`，与 `openspec/changes/<slug>/` 可并行

## 下一步阅读

- [架构](./ARCHITECTURE.md)
- [OpenCode 安装](./opencode-setup.md)
- [铁三角集成](./taiyi/integrations.md)
- [最小示例](../examples/minimal-project/README.md)
