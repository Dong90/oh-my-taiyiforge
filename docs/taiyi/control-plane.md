# TaiyiForge 控制面（对齐 OMX Cursor Adapter）

## 核心原则

1. **模型决策在聊天里**：阶段 Skill、Superpowers、ECC 在对话中加载。
2. **引擎过关由 Agent 代跑 shell**：`scripts/taiyi-forge.sh`，用户不必手打 `npx taiyi`。
3. **OpenCode 例外**：用 `taiyi_*` 插件工具，与 shell 等价。
4. **证据回流**：`.taiyi/changes/<slug>/` 工件 + `state.json` + `.harness-checkpoints.json`。

## 禁止

- 禁止未跑 `continue`（或等价 `complete` CLI）就声称阶段已完成。
- 禁止 auto 模式下跳过 `harness-check`。
- 禁止用引擎命令代替阶段 Skill 写 Markdown 工件（引擎只校验与推进）。

## 四端对照

| 端 | 聊天入口 | 引擎入口 |
|----|----------|----------|
| Codex | `$taiyi-new` … `$taiyi-archive`（`prompts/taiyi-*.md`） | Agent 跑 `taiyi-forge.sh` |
| Claude | `/taiyi:new` … `/taiyi:archive` + Skill + **`~/.claude/commands/taiyi-*.md`** | Agent Bash |
| Cursor | `/taiyi:new` … `/taiyi:status` + rules + **`~/.cursor/commands/taiyi-*.md`** | Agent 终端 / MCP 读状态 |
| OpenCode | `taiyi_new` / `taiyi_*` tools + **`~/.config/opencode/commands/taiyi-*.md`** | plugin + `/taiyi-*` 斜杠 |

完整九阶段路径：`docs/taiyi/workflow.md` · 详见 `docs/taiyi/invoke.yaml`。

## Token 纪律（Agent）

| 动作 | 命令 | 目的 |
|------|------|------|
| 清 slug | `/taiyi:archive` · `/taiyi:cancel … --remove-dir` · `prune --aborted` | 对话只带 1 个 active |
| 压缩 | `/taiyi:token compress <slug>` | 读 `CONTEXT-COMPACT.md`，勿全量工件 |
| E2E | CI / 后台跑 `playwright` · `npm test` · probe | 聊天只写 TEST.md 证据，不灌日志 |

详见 `prompts/inc/stage-protocol.md` · Skill `taiyi-compress`。

## 工件契约（Zod + hbs + md）

| 层 | 真源 | 职责 |
|----|------|------|
| **`{phase}.json`** | Zod schema（`src/schemas/`） | 语义、过关校验 |
| **`src/templates/*.hbs`** | Handlebars | 版式；json → md 渲染 |
| **`{PHASE}.md`** | 生成视图 | 人读、PR review；由引擎从 json 渲染 |
| **Skill** | `skills/taiyi-*` | 流程、门禁、写作纪律（不重复贴大纲） |

**默认主路径**

1. `new` / `continue`：`seedPhaseArtifacts` → 写 `{phase}.json` 骨架 + hbs 渲染 `{PHASE}.md`（带 seed 标记）
2. Agent **优先改 json**；改完后 `taiyi render [slug] [phase]` 或 `continue` 前引擎 `syncMarkdownFromJsonIfStale` 重渲染 md
3. 人只改 md 时 → `autoSyncLocalEdits` / reverse-sync 拉回 json

详见 [`artifact-contract.md`](./artifact-contract.md)。

## 探测与回归

十轮 / 多角度探测的归类、BY DESIGN 项与脚本误报修正见 **[probe-triage.md](./probe-triage.md)**。
