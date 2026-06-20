# Taiyi 自主编排（原生 · 自 OMC 迁移）

TaiyiForge **不依赖** oh-my-claudecode。下列能力在本仓库内原生实现，用户只说 `/taiyi:*` 斜杠；Agent 代跑 `scripts/taiyi-forge.sh`。

## 命令一览（斜杠 + prompt）

| 斜杠 | 引擎 | 作用 | prompt |
|------|------|------|--------|
| `/taiyi:ralph [slug]` | `ralph` | 验证命令循环；**ralplan-first** 门禁 | `prompts/taiyi-ralph.md` |
| `/taiyi:autopilot [slug]` | `autopilot` | 九阶段全自动（须 `--auto`） | `prompts/taiyi-autopilot.md` |
| `/taiyi:team [slug]` | `team` | plan → exec → verify → fix | `prompts/taiyi-team.md` |
| `/taiyi:ultrawork [slug]` | `ultrawork` | spawn 计划 + 并行切片 | `prompts/taiyi-ultrawork.md` |
| `/taiyi:agent <role\|list>` | `agent` | **29** 专 Agent 角色 | `prompts/taiyi-agent.md` |
| `/taiyi:step [slug]` | `step` | 单步驱动（ralph/autopilot/…） | `prompts/taiyi-step.md` |
| `/taiyi:daemon run <slug>` | `daemon run` | **无人闭环**：引擎 step/loop + 外部 Agent CLI | `prompts/taiyi-daemon.md` |
| `/taiyi:stop-mode` | `stop-mode` | 停止运行时模式 | `prompts/taiyi-stop-mode.md` |
| `/taiyi:modes` | `modes` | 列出活跃 mode 文件 | `prompts/taiyi-modes.md` |
| `/taiyi:keyword <text>` | `keyword` | 口头词 → 斜杠映射 | `prompts/taiyi-keyword.md` |
| `/taiyi:preflight` | 脚本 | Codex keyword+step 纪律 | `prompts/taiyi-preflight.md` |
| `/taiyi:plan` · `/taiyi:ralplan` | workflow | 战略规划 · 迭代计划 | `taiyi-plan.md` · `taiyi-ralplan.md` |
| `/taiyi:ultraqa` · … | workflow | QA · 视觉 · 澄清 · CCG · sciomc … | 见 `slash_catalog` |

## 无人 Agent 闭环（daemon）

对标 OMC 后台 daemon：**shell 进程**里循环「引擎能自动做的」+「需要 LLM 时调外部 CLI」，直到九阶段完成或达轮次上限。

```bash
# 须 init --auto（或 TAIYI_AUTO_HARNESS=1）
scripts/taiyi-forge.sh daemon run my-feature

# 仅引擎（不调 LLM）— CI 冒烟 / 工件已齐时
scripts/taiyi-forge.sh daemon run my-feature --engine-only

# 预览 Agent 命令与 prompt，不真正 exec
scripts/taiyi-forge.sh daemon run my-feature --dry-run

scripts/taiyi-forge.sh daemon status my-feature
```

每轮逻辑：

1. `step`（autopilot）— ralph verify、auto continue、harness 检查  
2. 仍阻塞 → 写 `.taiyi/ci-prompts/<slug>-<phase>.txt` 并调用 Agent CLI  
3. 重复直到 `completed` / `max-rounds` / 无 CLI 可调用

| 变量 | 默认 | 说明 |
|------|------|------|
| `TAIYI_DAEMON_PLATFORM` | auto | `cursor` / `codex` / `claude` / `opencode` |
| `TAIYI_DAEMON_AGENT_CMD` | — | 自定义 shell，占位符 `{{PROMPT}}` `{{SLUG}}` `{{PHASE}}` |
| `TAIYI_DAEMON_MAX_ROUNDS` | 30 | 闭环轮次上限 |
| `TAIYI_DAEMON_INTERVAL_MS` | 0 | 轮间 sleep（秒级取整） |
| `TAIYI_AUTO_HUMAN` | — | CI 时可自动过 change/design/review 人工门 |

与 `/taiyi:autopilot` + 聊天内 `/taiyi:continue xN` 的区别：**daemon 在终端常驻循环**，阻塞时会 **exec** codex/claude/cursor，而不是等用户在 IDE 里继续聊。

## 与 OMC 的差异

| OMC | TaiyiForge |
|-----|------------|
| `spawn_agent` | spawn **计划** + Cursor Task 协议；宿主派发 |
| tmux team | **无 tmux**；team 状态机 + 泳道 |
| keyword hook | Cursor/Claude hook；Codex → `/taiyi:preflight` 或 `/taiyi:keyword` |
| 须装 OMC | **不依赖** OMC |

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
