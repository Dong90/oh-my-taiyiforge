# TaiyiForge 最小示例

在**任意空目录**演示工作流（无需真实业务代码）。本目录含 **可运行的 counter 模块** 与 **九阶段全自动脚本**。

## 0. 本目录一键全流程（Cursor 推荐）

```bash
cd examples/minimal-project
npm install
npm test
node scripts/run-full-flow.mjs   # init --auto → 九阶段 → ci verify
```

逐步说明与 Bug 记录见 [WALKTHROUGH.md](./WALKTHROUGH.md)。

## 1. 安装与自检

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all
../../scripts/taiyi-forge.sh doctor   # 四端 skills + 控制面自检
```

## 2. 按变更类型创建

```bash
cd your-empty-project

# 全功能九阶段（Agent 代跑 scripts/taiyi-forge.sh，勿手打 npx taiyi）
../../scripts/taiyi-forge.sh init hello --title "Hello TaiyiForge"

# 纯 API（跳过 ui-design）
../../scripts/taiyi-forge.sh init api-fix --profile api --title "REST endpoint"

# 小修复五阶段
../../scripts/taiyi-forge.sh init hotfix --profile lite --title "Fix typo"
```

## 3. 日常循环（推荐）

```bash
../../scripts/taiyi-forge.sh next hello
../../scripts/taiyi-forge.sh list
# 编辑工件 …
../../scripts/taiyi-forge.sh complete hello change
../../scripts/taiyi-forge.sh next hello
```

`guide` / `status` 仍可用 `--json` 给 Agent 解析。

## 4. 辅助 Skill

```bash
../../scripts/taiyi-forge.sh assess hello
../../scripts/taiyi-forge.sh mark-aux hello taiyi-intel-scan
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
../../scripts/taiyi-forge.sh sync-openspec hello
../../scripts/taiyi-forge.sh archive hello
```

详见 [docs/QUICKSTART.md](../../docs/QUICKSTART.md)。
