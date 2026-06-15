# TaiyiForge 快速开始

> **何时读本文**：第一次安装或跑通 `new → status → continue → archive` 时。**命令全集** → [canonical-commands.md](./taiyi/canonical-commands.md) · **工件目录** → [artifact-layout.md](./taiyi/artifact-layout.md)

5 分钟跑通 **OpenCode / Claude / Codex / Cursor** 任一端。

## 最快路径（推荐）

```bash
git clone https://github.com/Dong90/oh-my-taiyiforge.git
cd oh-my-taiyiforge
npm install && npm run build && npm test

cd examples/minimal-project
npm install
npm run chat-demo          # 聊天动词：new / status / check / continue
npm run walkthrough-e2e    # 九阶段 shell E2E + 铁三角
npm run taiyi:doctor       # 工作区 + 安装自检
```

本地链 `TAIYI_FORGE_ROOT` 开发时务必先 **`npm run build`**，否则 `dist/` 与源码不一致。

## 安装

```bash
npm install oh-my-taiyiforge
npx taiyi-forge-install --all    # 含 OpenSpec / gstack / Superpowers / web-quality-skills（可用 --skip-deps 跳过）
npx taiyi doctor --strict-workspace   # 确认四端 skills + 工作区流程
# 消费方项目还会得到 npm run taiyi:doctor / taiyi:verify
```

| 端 | 验证 |
|----|------|
| OpenCode | `opencode.json` 含 `oh-my-taiyiforge`；重启后可见 `taiyi_new` / `taiyi_*` 工具 |
| Claude | `ls ~/.claude/skills/taiyi-change` · `~/.claude/mcp.json` |
| Codex | `ls ~/.codex/skills/taiyi-change` · `~/.codex/mcp.json` |
| Cursor | `~/.cursor/skills/taiyi-change` · `taiyiforge.mdc` · 项目 `.cursor/mcp.json` |

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

npx taiyi walkthrough       # 首次体验：doctor + init + 打印下一步（不跑九阶段）
# 或手动：
npx taiyi new "My Feature"                          # 日常推荐 — 自动 slug
npx taiyi init my-first --title "My First Change"   # 固定 slug / CI
npx taiyi next my-first     # 人类可读下一步（推荐）
```

编辑 `.taiyi/changes/my-first/CHANGE.md` 后：

```bash
# change / design / review 为人工门，需 --approver
npx taiyi complete my-first change --approver "你的名字"
npx taiyi next my-first
npx taiyi list
```

人工门阶段也可用：`npx taiyi continue my-first --approver "你的名字"` 或 `npx taiyi done my-first --approver "你的名字"`。  
仅 CI/测试可设 `TAIYI_AUTO_HUMAN=1` 跳过审批。

## dev 后 commit + integration 交付门

实现并 `complete dev/test` 后，**integration 前**须有带 trailer 的 git commit。聊天推荐 **`/taiyi:commit`**；脚本可用：

```bash
npx taiyi commit-trailers my-first "feat: export large files"
# 复制输出的 message，git commit -F -
git commit -m "$(cat <<'EOF'
feat: export large files

Taiyi-Change: my-first
Taiyi-Phase: dev
EOF
)"
```

可选：`package.json` 的 `"taiyi": { "deliveryVerifyCmd": "npm test" }`（`npx taiyi-forge-install` 在存在 `scripts.test` 时会自动写入），或环境变量 `TAIYI_DELIVERY_VERIFY_CMD`；integration 前自动跑验证命令。

## 聊天命令（OpenSpec 风格）

**完整开源流程（推荐）**：`/taiyi:full-flow` → [full-oss-flow.md](./taiyi/full-oss-flow.md)  
**Superpowers 主轴摘要**：`/taiyi:flow` → [superpowers-flow.md](./taiyi/superpowers-flow.md)  
**四端入口决策树**：[`invoke.yaml`](./taiyi/invoke.yaml) · [`omc-reference.md`](./taiyi/omc-reference.md)

| 命令 | 用途 |
|------|------|
| `/taiyi:new 名称` | 新建变更 |
| `/taiyi:status` | 阶段进度 + **Superpowers 推荐** + 工件就绪 |
| `/taiyi:continue` | 尝试过关（工件 + auto 时 harness-check/mark-aux；人工门 `--approver`） |
| `/taiyi:apply` | dev / test **实现清单**（不写代码、不 complete；实现后须 continue） |
| `/taiyi:handoff` | 跨会话暂停，写 HANDOFF.md |
| `/taiyi:cancel` | 放弃活跃变更 |
| `/taiyi:health` | **仅输出协议**；须 Agent 跑 taiyi-health 写 report + mark-aux |
| `/taiyi:loop` | 循环 continue；**人工门会阻塞**，不能一路跑到 archive |
| `/taiyi:check` | auto 模式 harness 清单 |
| `/taiyi:explore` | change 头脑风暴（→ Superpowers brainstorming） |
| `/taiyi:token status` | Token 用量 / 预算 / 压缩建议 |
| `/taiyi:token record` | 上报 Agent Token |
| `/taiyi:token scan` | 扫描工件 Token |
| `/taiyi:token compress` | 压缩 → CONTEXT-COMPACT.md |
| `/taiyi:review-loop` | review 机器审查；不过则继续修再跑 |
| `/taiyi:review-check` | 单次 review 循环门禁（≠ `complete review` 的 Approve 勾选） |
| `/taiyi:archive` | 九阶段完成后归档 |

Codex 用 `$taiyi-new` 等；完整列表见 [`docs/taiyi/commands.yaml`](./taiyi/commands.yaml)。

**意图分析**：`status` / `guide` 会显示从 CHANGE/REQUIREMENT 推断的「模块≈… · 含/无 UI · 测试层级≈… · 复杂度 …」。**medium/high** 在 review 阶段会显式提示须 **taiyi-health**。

## 全自动模式（对齐架构图）

```bash
npx taiyi init my-feature --auto --title "My Feature"
npx taiyi harness my-feature    # 铁三角 → 辅助 → 主流程 有序清单
```

在 Cursor 加载 **`taiyi-orchestrator`** Skill，让 Agent 按清单自动执行 Superpowers / gstack / taiyi 辅助，每步**必选**铁三角后：

```bash
npx taiyi-forge-install --all   # 或 npm link 后安装四端 17 skills
scripts/taiyi-forge.sh harness-check my-feature superpowers/brainstorming
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
| test | gstack `qa` | 有 Web 时建议跑；CLI-only 可跳过 |
| integration | OpenSpec archive | 可选归档 |

harness 清单里标 **(可选)** 的项不会阻塞 `--auto` 过关。详见 [workflow §可选层](./taiyi/workflow.md) 与 [GAP-CLOSURE](./GAP-CLOSURE.md)。

## Profile（按变更类型）

| Profile | 说明 |
|---------|------|
| `full` | 九阶段（默认） |
| `api` | 跳过 `ui-design`（纯后端/API） |
| `ui` | 与 `full` 相同九阶段（仅命名区别） |
| `lite` | 五阶段：change → requirement → dev → test → integration（**无 review**） |

```bash
npx taiyi init fix-bug --profile lite
npx taiyi init new-api --profile api --strict-dev
```

## 辅助 Skill

```bash
npx taiyi assess my-first          # 自动读 CHANGE 推断复杂度
npx taiyi mark-aux my-first taiyi-intel-scan   # 标记辅助 Skill 已完成
```

`CONTEXT.md` 可从 [`templates/CONTEXT.md`](../templates/CONTEXT.md) 起步，由 **taiyi-intel-scan** 填写。设计阶段可用 **`/taiyi:diagram-pipeline`**（C4 真源 → 工程图 → PNG 一条链）或分步 **`/taiyi:diagram-c4`** → **`/taiyi:diagram-arch`** → **`/taiyi:diagram-render`**；流程图用 **`/taiyi:diagram-flow`**。详见 [`docs/diagrams/pipeline.md`](diagrams/pipeline.md)。上下文过大时用 **`/taiyi:token compress <slug>`** 生成 `CONTEXT-COMPACT.md`；**handoff** 时若超阈值会在 HANDOFF.md 提示。

## Token 预算（可选）

```text
/taiyi:token status my-first
/taiyi:token record my-first 5000 --phase change --label "brainstorm"
```

Agent 代跑 `scripts/taiyi-forge.sh token …`。`export TAIYI_TOKEN_ENFORCE=1` 超预算禁止 complete。

详见 [token-budget.md](./taiyi/token-budget.md)。

## OpenCode 对话内

```
taiyi_new title="My Feature"
taiyi_init slug=demo-feature title="Demo" profile=full
taiyi_status slug=demo-feature
taiyi_complete slug=demo-feature phase=change approver=you
taiyi_commit_trailers slug=demo-feature subject="feat: slice"
taiyi_handoff slug=demo-feature note="pause"
taiyi_mark_aux slug=demo-feature skill=taiyi-health
```

日常人类可读进度用 `taiyi_status`；`taiyi_guide` 为 JSON。`taiyi_doctor` 传 `strict: true` 对齐 `--strict-workspace`。

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

- [Token 预算与压缩](./taiyi/token-budget.md)
- [架构](./ARCHITECTURE.md)
- [架构审计补齐对照](./GAP-CLOSURE.md)
- [OpenCode 安装](./opencode-setup.md)
- [铁三角集成](./taiyi/integrations.md)
- [minimal-project 逐步清单](../examples/minimal-project/WALKTHROUGH.md)
