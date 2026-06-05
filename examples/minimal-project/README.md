# TaiyiForge 最小示例

在**任意空目录**演示工作流（无需真实业务代码）。

## 1. 安装与自检

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all
npx taiyi doctor          # 四端 skills + plugin 自检
```

## 2. 按变更类型创建

```bash
cd your-empty-project

# 全功能九阶段
npx taiyi init hello --title "Hello TaiyiForge"

# 纯 API（跳过 ui-design）
npx taiyi init api-fix --profile api --title "REST endpoint"

# 小修复五阶段
npx taiyi init hotfix --profile lite --title "Fix typo"
```

## 3. 日常循环（推荐）

```bash
npx taiyi next hello        # 人类可读「下一步」
npx taiyi list              # 所有进行中的变更
# 编辑工件 …
npx taiyi complete hello change
npx taiyi next hello
```

`guide` / `status` 仍可用 `--json` 给 Agent 解析。

## 4. 辅助 Skill

```bash
npx taiyi assess hello
npx taiyi mark-aux hello taiyi-intel-scan
```

## 5. 冒烟与引导

```bash
# 仓库内一键九阶段
cd oh-my-taiyiforge && npm run dogfood

# 首次体验（api profile + doctor）
npm run walkthrough
```

## 6. OpenSpec（可选）

```bash
npx taiyi sync-openspec hello
npx taiyi archive hello
```

详见 [docs/QUICKSTART.md](../../docs/QUICKSTART.md)。
