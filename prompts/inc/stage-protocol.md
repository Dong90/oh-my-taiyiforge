## Agent 协议（必须遵守）

### Agent vs 引擎（第三方调用）

| 谁 | 做什么 | 怎么调 |
|----|--------|--------|
| **Agent** | 加载 Skill、写工件、TDD/CR/QA 对话 | `/taiyi:write` · `/taiyi:skill …` · `@taiyi-*` |
| **引擎** | 校验、advance、spawn CLI、归档 | `taiyi-forge.sh status/continue/harness`；`cap/*` → `providers.yaml` |

引擎**不会**替 Agent 跑 Superpowers/ECC 的 LLM。`harness` 只列清单；`--auto` 须 `harness-check` 打卡。详见 `docs/taiyi/invoke-routing.md` 与 `prompts/inc/third-party-invoke.md`。

### 真源

以 **`engineTruth`** 为准（`scripts/taiyi-forge.sh status [slug] --json --compact`）。解析 `currentPhase`、`skill`、`artifact`、`qualityReady`、`nextAction`、`blockers`、`profile`、`skippedPhases`。**勿凭聊天记忆**声称阶段已完成或未跑 `continue` 就推进。

仅 1 个 active 变更时可省略 slug；多变更须显式指定。

### 流程分轨（先判断你在哪条轨）

| 轨 | 典型斜杠 / 入口 | Agent 做什么 |
|----|-----------------|--------------|
| **九阶段工件** | `new` `status` `write` `continue` `apply` | 见「工件循环」 |
| **归档** | `archive` | 仅 workflow 完成后 `taiyi-forge.sh archive`；然后清上下文 |
| **交付链** | `commit` `ship` `land` `release` | 走引擎 CLI；**不走** write→continue |
| **会话** | `pause` `cancel` `list` | `pause`/`cancel`/`list`；恢复用 `pause --resume` |
| **项目规划** | `plan` | `@taiyi-plan`；拆解后批量 `new`；尚无单 slug 循环 |
| **CI 门禁** | `verify` | `taiyi-forge.sh verify`（工件+ harness，无 LLM） |
| **伞形** | `token` `test` `review` `diagram` `skill` | 按子命令路由 Skill / 引擎；遵守 Token 纪律 |
| **运行时** | `ralph` `autopilot` `daemon` `team` `ultrawork` | **仅引擎** `taiyi-forge.sh …`；用户显式要求才启动 |
| **首次体验** | `run` / `walkthrough` | `taiyi-forge.sh walkthrough`；演示 slug 结束应 archive/cancel |

### 九阶段工件循环

```text
status → write（@taiyi-* Skill 写当前阶段工件）→ status（预检）→ 用户确认 → continue
```

- **`write` 写工件 · `continue` 过关** — 禁止用引擎子命令代替 Skill 填 Markdown。
- **`write` 后须再 `status`** — `scripts/taiyi-forge.sh status [slug] --json --compact`，读 `engineTruth.qualityReady` / `blockers`；用户确认后再 `continue`（保存 md **不会**自动校验）。
- **`new` 后**：只铺当前阶段模板（通常 CHANGE.md），**勿**自动 continue 或写后续阶段 md，除非用户要求。
- **`continue` 失败**：读 `blockers` / `nextAction`，补工件 / harness / `--approver` 后重试；**禁止跳阶段**（除非 status 报顺序冲突且用户确认清理超前 md）。
- **`apply`**：仅 **dev/test** 打印实现清单；**不**代写代码、**不**过关。实现后写证据（如 `.dev-complete`），再 `continue`。
- **`archive`**：integration 完成且 `continue` 过关后执行；**不**代替 continue 写 integration 工件。

### Profile 与跳阶段

- 以 `engineTruth.profile` 与 `skippedPhases` 为准（`lite` / `api` / `full` 等）。
- **被跳过的阶段**：勿写对应 md，勿在 continue 中声称已完成。
- `api` 常跳过 `ui-design`；`lite` 跳过更多 — 一律以 status 当前 `skill`/`artifact` 为准。

### 阶段边界

1. 只处理 **当前阶段** 工件（以 `/taiyi:status` 的 Skill/artifact 为准）。
2. **change → … → task**：只写 `.taiyi/changes/<slug>/` 下 md；**dev/test 之前禁止改业务代码**（`src/`、`app/`、`packages/` 等）。
3. **dev / test**：**须**按 `@taiyi-dev` / `@taiyi-test` + TDD 改业务代码与测试；禁止越界改无关模块。
4. change / design / review 人工门：`continue --approver "名"`（OpenCode：`taiyi_continue` + approver）。

### 伞形域（兼容 v28 legacy 子命令）

| 伞形 | 子命令 → 加载 | 引擎（可选） |
|------|----------------|--------------|
| `token` | `compress`→`@taiyi-compress`；其余子命令走引擎 | `token status\|record\|scan\|compress` |
| `test` | `smoke`/`e2e`/`qa`/`ui`/`security` 见 `taiyi-test` prompt | `browser-smoke` 等 |
| `review` | `loop`/`check`→`@taiyi-review`；`health`→`@taiyi-health` | `review-loop` `review-check` `health` |
| `diagram` | `pipeline/c4/arch/render/flow`→对应 `@taiyi-diagram-*` | `mark-aux` 打卡 |
| `skill` | `sp`/`explore`/`tdd`/`flow` 外部 Skill | 无统一引擎子命令 |

伞形 **不**替代九阶段 `write`；若在某一阶段内调用，仍须 respect 当前 `currentPhase`。

### 辅助 Skill（可选 · 常于 write 后或 status 推荐）

`@taiyi-intel-scan` `@taiyi-compress` `@taiyi-architect` `@taiyi-diagram-*` `@taiyi-health` 等 — 按 status 双线 harness 推荐加载；完成后 `mark-aux <slug> <skill-id>`（引擎）。

### 运行时模式（引擎 · 用户显式触发）

| 模式 | 引擎 | 注意 |
|------|------|------|
| `ralph` / `autopilot` / `daemon run` | `taiyi-forge.sh …` | 不得跳过 harness-check；人工门仍须 approver |
| `team` / `ultrawork` | 同上 | 并行 slice 后合并，再 `continue` |
| `loop` / `continue xN` | `continue` 重复 | 遇人工门停止，勿硬闯 |
| `walkthrough` / `run` | `walkthrough` | 演示结束 archive/cancel 演示 slug |

### 执行方式

- 用户只说 **`/taiyi:*` 斜杠**（Codex：`$taiyi-*`）；你代跑 **`scripts/taiyi-forge.sh`**，禁止让用户手打 shell。
- **OpenCode**：`taiyi_*` 插件工具与 shell **等价**。
- **Cursor MCP**：`taiyi_state_get_status` 等须与 `engineTruth` 对齐。
- 全自动须 `/taiyi:new … --auto` 或 `TAIYI_AUTO_HARNESS=1`；**默认手动九阶段**；auto **不得跳过 harness-check**。

### Legacy 引擎 CLI（无顶栏斜杠 · 脚本仍可用）

`next` `guide` `complete` `harness` `harness-check` `phases` `doctor` `audit` `init` `flow <scenario>` `change`…`integration` `plan [file]` `sync-openspec` — 均经 `taiyi-forge.sh`；聊天优先用 v30 顶栏等价物（如 `status` 代替 `next` 只看状态）。

### 排查

`doctor --json --compact` · `audit [slug] --json --compact` — 只摘失败项，勿全量 dump。

## Token 纪律（必须遵守 · 省上下文）

1. **清 slug**：对话只带 1 个 active。完成后 **`/taiyi:archive`**；废弃 **`/taiyi:cancel <slug> --remove-dir`**；`list --all` 仅必要时。
2. **archive 闭环**：integration 完成后 archive，再 `new`；勿在 completed 变更上续聊。
3. **compress**：长阶段或进 dev 前 **`/taiyi:token compress <slug>`** → 优先 `CONTEXT-COMPACT.md`。
4. **E2E 别在对话跑**：playwright / 全量 test / walkthrough / probe → CI 或后台；聊天只写 **TEST.md** 摘要。
