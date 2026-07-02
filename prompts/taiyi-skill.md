<!-- TAIYI-FORGE:CHAT-COMMAND:taiyi-skill.md -->
---
canonical: v30
umbrella: skill
chat: /taiyi:skill <name>
codex: $taiyi-skill
engine: "加载对应 skill prompt/SKILL.md"
since: v0.30.0
---

# /taiyi:skill — 外部 Skill 路由（v30 单一伞形）

`/taiyi:skill <name>` 是**外部 Skill 的唯一伞形入口**，吸收原 `/taiyi:gstack` · `/taiyi:sp` · `/taiyi:explore` · `/taiyi:tdd` · `/taiyi:flow` 5 个独立入口。

## 路由表

| 调用 | 加载 |
|------|------|
| `/taiyi:skill gstack <name>` | gstack Skill：`review` · `qa` · `design-shotgun` · `autoplan` · `canary` · `design-review` · `gstack-upgrade` · `browse` … |
| `/taiyi:skill sp <name>` | Superpowers：`brainstorming` · `test-driven-development` · `writing-plans` · `writing-skills` · `verification-before-completion` … |
| `/taiyi:skill explore` | 同 `sp brainstorming` |
| `/taiyi:skill tdd plan\|dev` | TDD 红绿重构（plan=测试计划，dev=红→绿→重构） |
| `/taiyi:skill flow <verb>` | 引擎剧本：`ralph` · `autopilot` · `team` · `ultrawork` · `agent` · `step` · `stop-mode` … |
| `/taiyi:skill flow mvp\|micro\|nano` | 短流程场景（lite 路径） |

等价于（历史斜杠 → v30）:

- `/taiyi:gstack <name>` → `/taiyi:skill gstack <name>`
- `/taiyi:sp <name>` → `/taiyi:skill sp <name>`
- `/taiyi:explore` → `/taiyi:skill explore`
- `/taiyi:tdd plan|dev` → `/taiyi:skill tdd plan|dev`
- `/taiyi:flow …` → `/taiyi:skill flow …`

**步骤：**

1. 解析 `$ARGUMENTS` 第一个词：`gstack` / `sp` / `explore` / `tdd` / `flow` 或直连 skill 名
2. 在宿主加载对应 **Skill**（`~/.cursor/skills` · `~/.claude/skills` · gstack · superpowers）
3. 执行 Skill 正文；涉及引擎状态时先 `/taiyi:status --json --compact`
4. 需要写工件时回到 `/taiyi:write` + `@taiyi-*` 九阶段 Skill

完整子命令地图：[canonical-commands.md](../docs/taiyi/canonical-commands.md)

## Agent 协议（必须遵守）

1. 只处理 **当前阶段** 工件（以 `/taiyi:status` 的 Skill/artifact 为准）；勿跳步写后续阶段 md。
2. **dev/test 之前禁止改业务代码**（`src/`、`app/` 等）；规划阶段只写 `.taiyi/changes/<slug>/` 下 json 真源，再 `render` 刷新 md。
3. 每步：`/taiyi:status --json --compact` → 用户确认 → `/taiyi:continue --approver 名`（change/design/review 人工门）。
4. 以 **`engineTruth`** 为准（`status --json --compact`）；勿凭聊天记忆声称「已完成」。
5. 安装/交付排查：`doctor --json --compact` · `audit --json --compact`（勿全量 dump report）。
6. 全自动须显式 `/taiyi:new … --auto` 或 `TAIYI_AUTO_HARNESS=1`；**默认手动九阶段**。
7. 用户只说 **`/taiyi:*` 斜杠**；你代跑 `scripts/taiyi-forge.sh`，禁止让用户手打 shell。

## Token 纪律（必须遵守 · 省上下文）

1. **清 slug**：只保留 1 个 active。integration 完成后 **`/taiyi:archive`**；废弃用 **`/taiyi:cancel <slug> --remove-dir`**；探针/演示 slug 归档或取消，勿堆在对话上下文里。
2. **archive 闭环**：九阶段/integration 完成后立刻 archive，再开 `/taiyi:new`；勿在 completed 变更上继续聊。
3. **token compress**：长阶段后或进入 dev 前跑 **`/taiyi:token compress <slug>`**，后续优先读 `CONTEXT-COMPACT.md`，勿全量读 CHANGE…CHANGELOG 进聊天。
4. **E2E 别在对话里跑**：`playwright test`、`npm test`、全量 walkthrough、probe 套件 → **CI / 后台终端**执行；聊天里只把命令+exit+摘要写入 **TEST.md**，禁止把整段测试日志灌进对话。
