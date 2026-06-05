# TaiyiForge 最小示例

在**任意空目录**演示九阶段工作流（无需真实业务代码）。

## 1. 安装

```bash
npm install oh-my-taiyiforge
# 或本地开发：
# npm install file:../../oh-my-taiyiforge
npx taiyi-forge-install --all
```

OpenCode 用户确保 `opencode.json` 含 `"oh-my-taiyiforge"`。

## 2. 创建变更

```bash
cd your-empty-project
npx taiyi init hello-taiyi --title "Hello TaiyiForge"
```

会在 `.taiyi/changes/hello-taiyi/` 生成 8 个 Markdown 模板。

## 3. 按阶段推进

```bash
npx taiyi guide hello-taiyi    # 当前该做什么 + 铁三角推荐
# 编辑 CHANGE.md …
npx taiyi complete hello-taiyi change
# 重复 guide → 编辑 → complete 直到 integration
```

或一键冒烟（本仓库内）：

```bash
cd oh-my-taiyiforge
npm run dogfood
```

## 4. OpenSpec（可选）

若项目已 `openspec init` 且有 `openspec/changes/hello-taiyi/`：

```bash
npx taiyi archive hello-taiyi
```

## 5. 铁三角

| 层 | 本示例中的用法 |
|----|----------------|
| OpenSpec | 可选 archive |
| Superpowers | `guide` 的 `harness.hooks` 推荐 brainstorming / TDD |
| gstack | review 阶段加载 `gstack/review` Skill（Agent 内，非 shell） |

详见 [docs/QUICKSTART.md](../../docs/QUICKSTART.md)。
