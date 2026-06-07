# TaiyiForge 控制面（对齐 OMX Cursor Adapter）

## 核心原则

1. **模型决策在聊天里**：阶段 Skill、Superpowers、gstack 在对话中加载。
2. **引擎过关由 Agent 代跑 shell**：`scripts/taiyi-forge.sh`，用户不必手打 `npx taiyi`。
3. **OpenCode 例外**：用 `taiyi_*` 插件工具，与 shell 等价。
4. **证据回流**：`.taiyi/changes/<slug>/` 工件 + `state.json` + `.harness-checkpoints.json`。

## 禁止

- 禁止未跑 `complete` 就声称阶段已完成。
- 禁止 auto 模式下跳过 `harness-check`。
- 禁止用引擎命令代替阶段 Skill 写 Markdown 工件（引擎只校验与推进）。

## 四端对照

| 端 | 聊天入口 | 引擎入口 |
|----|----------|----------|
| Codex | `$taiyi-new` … `$taiyi-archive`（`prompts/taiyi-*.md`） | Agent 跑 `taiyi-forge.sh` |
| Claude | `/taiyi:new` … `/taiyi:archive` + Skill | Agent Bash |
| Cursor | `/taiyi:new` … `/taiyi:status` + rules | Agent 终端 / MCP 读状态 |
| OpenCode | `taiyi_new` / `taiyi_*` tools | 同左（plugin，无需 shell） |

完整九阶段路径：`docs/taiyi/workflow.md` · 详见 `docs/taiyi/invoke.yaml`。
