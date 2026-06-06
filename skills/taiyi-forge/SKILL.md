---
name: taiyi-forge
description: TaiyiForge 引擎控制面 — 在对话中代跑 scripts/taiyi-forge.sh（init/next/harness/complete），对齐 OMX 的 omc.sh，无需用户手打 npx。
---

# taiyi-forge（引擎 Skill）

## 何时使用

- 用户输入 **OpenSpec 风格**命令：`/taiyi:new`、`/taiyi:continue`、`/taiyi:apply`、`/taiyi:archive`
- Codex：`$taiyi-new`、`$taiyi-continue`、`$taiyi-apply`、`$taiyi-archive`
- 需要 **推进引擎状态**（非写 CHANGE/DESIGN 工件 — 那些用 `taiyi-change` 等）

## 核心命令（四动词 + status，九阶段见 docs/taiyi/workflow.md）

| 聊天 | 含义 |
|------|------|
| `/taiyi:new 功能名` | 新建变更 |
| `/taiyi:status` | **当前阶段（如 3/9）、Skill、工件状态** |
| `/taiyi:continue` | 规划/收尾阶段推进（**每阶段写完工件后各一次**；人工门需 `--approver`） |
| `/taiyi:apply` | dev/test 实现 |
| `/taiyi:archive` | 归档 |

Codex：`$taiyi-new` … `$taiyi-status` …

九阶段不会合并：`continue` 在 change→requirement→…→integration 要**反复使用**，中间用 `taiyi-change` 等 Skill 写工件。

## 辅助命令（对标 OMX doctor / run）

| 聊天 | 用途 |
|------|------|
| `/taiyi:doctor` | 安装自检 |
| `/taiyi:list` | 多变更时列 slug |
| `/taiyi:check` | auto 模式 harness 清单 |
| `/taiyi:sync` | OpenSpec 同步 |
| `/taiyi:run` | 演示 walkthrough |
| `/taiyi:loop [xN]` | 循环 continue 直到完成或阻塞 |
| `/taiyi:review-loop` | review 机器审查；不过则修完再跑，通过后再 complete |
| `/taiyi:token status` | Token 用量 / 预算 |
| `/taiyi:token record` | 上报 Token |
| `/taiyi:token scan` | 扫描工件 Token |
| `/taiyi:token compress` | 压缩 → CONTEXT-COMPACT.md |

详见 `docs/taiyi/commands.yaml` → `auxiliary`

## 调用方式（四端明细）

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
scripts/taiyi-forge.sh complete my-feature change --approver "你的名字"
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
