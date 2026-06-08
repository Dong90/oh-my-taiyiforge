# Taiyi 自主编排（原生 · 自 OMC 迁移）

TaiyiForge **不依赖** oh-my-claudecode。下列能力在本仓库内原生实现，用户只说 `/taiyi:*` 斜杠；Agent 代跑 `scripts/taiyi-forge.sh`。

## 命令一览

| 斜杠 | 引擎 | 作用 |
|------|------|------|
| `/taiyi:autopilot [slug]` | `autopilot` | 九阶段全自动指引（须 `--auto` / autoHarness） |
| `/taiyi:ralph [slug]` | `ralph` | 验证命令循环；**ralplan-first** 门禁 |
| `/taiyi:team [slug]` | `team` | plan → prd → exec → verify → fix |
| `/taiyi:ultrawork [slug]` | `ultrawork` | 最多 6 路 spawn 计划 + 并行切片 |
| `/taiyi:agent <role\|list> [slug]` | `agent` | **29** 专 Agent 角色 |
| `/taiyi:stop-mode [--force]` | `stop-mode` | 停止运行时模式（对标 OMC cancel） |
| `/taiyi:modes` | `modes` | 列出 `.taiyi/runtime/*-mode.json` |
| `/taiyi:plan` · `/taiyi:ralplan` | workflow | 战略规划 · 迭代计划 |
| `/taiyi:ultraqa` · `/taiyi:visual-verdict` | workflow | QA 循环 · 视觉裁决 |
| `/taiyi:deep-interview` · `/taiyi:ai-slop-cleaner` · `/taiyi:ecomode` | workflow | 澄清 · 清理 · 省 token |
| `/taiyi:ccg` · `/taiyi:sciomc` · `/taiyi:deepinit` | workflow | 多模型合成 · 科研 · 分层 AGENTS |
| `/taiyi:remember [note]` | — | `.taiyi/project-memory.json` |

## 运行时状态

| 文件 | 说明 |
|------|------|
| `.taiyi/runtime/*-mode.json` | ralph / autopilot / team / ultrawork 等 |
| `.taiyi/changes/<slug>/.ralph-state.json` | ralph 轮次 |
| `.taiyi/project-memory.json` | 跨变更记忆 |

关键词（可选）：`ralph`、`autopilot`、`ulw`、`team`、`ralplan`、`ccg`、`deslop`、`stopomc` → 见 `keyword-modes.ts`。Cursor + Claude Code 安装 hook 后口头触发自动注入。

## 与 review-loop 的分工

- **ralph** — 仓库验证命令（测试/build）
- **review-loop** — REVIEW.md 机器门禁

review 阶段通常两者都用。

## 典型串联

```text
/taiyi:new 功能 X --auto
  → /taiyi:ralplan（或 /taiyi:plan）
  → /taiyi:team
  → /taiyi:ultrawork（dev 切片 + spawn 计划）
  → /taiyi:ralph
  → /taiyi:review-loop
  → /taiyi:continue
  → /taiyi:stop-mode（结束模式）
```

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `TAIYI_RALPH_VERIFY_CMD` | — | 覆盖 ralph 验证命令 |
| `TAIYI_RALPH_MAX_ROUNDS` | 30 | ralph 轮次上限 |
| `TAIYI_TEAM_MAX_FIX` | 5 | team fix 泳道轮次 |
| `TAIYI_DELIVERY_VERIFY_CMD` | package.json | 交付/ralph 共用 verify |

## 相关

- [agent-roles.yaml](./agent-roles.yaml) — 角色与阶段映射
- [omc-reference.md](./omc-reference.md) — 与 OMC 对照（非集成）
- [commands.yaml](./commands.yaml) — 完整斜杠目录
