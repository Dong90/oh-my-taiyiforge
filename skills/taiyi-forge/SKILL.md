---
name: taiyi-forge
description: TaiyiForge 引擎控制面 — 在对话中代跑 scripts/taiyi-forge.sh（init/next/harness/complete），对齐 OMX 的 omc.sh，无需用户手打 npx。
---

# taiyi-forge（引擎 Skill）

## 何时使用

- 用户说 `$taiyi-forge`、`taiyi-forge next`、`过关`、`complete`、`harness`
- 需要 **推进阶段、打卡、查状态**（引擎层），而非写 CHANGE/DESIGN 等工件（用 `taiyi-change` 等）

## 调用方式（四端）

| 端 | 你怎么调 |
|----|----------|
| **Codex** | 对话输入 `$taiyi-forge next <slug>` 或加载本 Skill |
| **Claude Code** | 加载本 Skill，用 **Bash** 代跑下方命令 |
| **Cursor** | 加载本 Skill，用 **终端工具** 代跑下方命令 |
| **OpenCode** | 优先用插件工具 `taiyi_init` / `taiyi_complete`（与本脚本等价） |

## 你必须代跑 shell（禁止只口头说「已完成」）

在项目根目录执行（路径三选一，Agent 自动探测）：

```bash
# 优先：项目内依赖
./node_modules/oh-my-taiyiforge/scripts/taiyi-forge.sh <cmd> ...

# 或 monorepo / 开发仓库
scripts/taiyi-forge.sh <cmd> ...

# 或全局安装
taiyi-forge <cmd> ...
```

## 常用命令

```bash
scripts/taiyi-forge.sh init my-feature --auto --title "功能名"
scripts/taiyi-forge.sh next my-feature
scripts/taiyi-forge.sh harness my-feature
scripts/taiyi-forge.sh harness-check my-feature superpowers/brainstorming
scripts/taiyi-forge.sh complete my-feature change
scripts/taiyi-forge.sh list
scripts/taiyi-forge.sh doctor
```

## 与阶段 Skill 的分工

1. **`taiyi-forge`**（本 Skill）→ 引擎：状态、门禁、过关  
2. **`taiyi-orchestrator`** → `--auto` 时按 harness 清单编排  
3. **`taiyi-change` … `taiyi-integration`** → 写各阶段工件  
4. **Superpowers / gstack** → 铁三角纪律（聊天内加载，非本脚本）

## auto 模式过关顺序

1. `harness <slug>` 读清单  
2. 铁三角 Agent 执行 → `harness-check <slug> <key>`  
3. 辅助 Skill 产出工件  
4. 主 Skill 写工件  
5. `complete <slug> <phase>`  

## 失败时

- 读脚本 stderr，按提示补打卡或工件后重试  
- `doctor` 检查四端 skills 与 rules  
