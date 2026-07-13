---
name: taiyi-forge
description: TaiyiForge 引擎控制面 — 用户只说 /taiyi:* 斜杠，Agent 代跑 scripts/taiyi-forge.sh
---

<constraints>
SYSTEM OF RECORD: `taiyi status --json --compact` 的 `engineTruth.currentPhase` 是阶段状态的唯一来源。
DO NOT infer current phase from conversation history or memory.
DO NOT anticipate or prepare artifacts for future phases.
If engineTruth shows a different phase than what you recall, trust engineTruth — halt and reload state.
EXACT SLASH ONLY: ONLY respond to exact slash commands (/taiyi:continue, /taiyi:status, etc.). If the user types natural language (e.g., "继续" or "帮我推进"), DO NOT interpret it — guide them to use /taiyi:orchestrator or the exact slash command.
</constraints>

# taiyi-forge（引擎 Skill）

## 原则

- **用户只说 `/taiyi:*`**（Codex：`$taiyi-*`）；你代跑 `scripts/taiyi-forge.sh`，禁止让用户手打 shell。
- 读状态默认：**`status [slug] --json --compact`** → 解析 **`engineTruth`**。以 engineTruth 为准，不以对话记忆为准。
- 写工件 → **`/taiyi:write`**，编辑 **`{phase}.json`**，再 **`/taiyi:render`** 刷新 md，然后加载当前阶段 `taiyi-change` … `taiyi-integration` Skill。

## 主流程（仅这五条）

| 斜杠 | 引擎 |
|------|------|
| `/taiyi:new` | `new` |
| `/taiyi:status` | `status --json --compact` |
| `/taiyi:write` | `write` |
| `/taiyi:render` | `render [slug] [phase]` — json→md（Zod+hbs） |
| `/taiyi:continue` | `continue` |
| `/taiyi:apply` | `apply`（dev/test） |
| `/taiyi:archive` | `archive` |

**其余斜杠**（doctor、audit、ralph、token 等）→ [`docs/taiyi/canonical-commands.md`](../../docs/taiyi/canonical-commands.md) · [`docs/taiyi/commands.yaml`](../../docs/taiyi/commands.yaml)

## 执行协议（破坏性操作）

| 斜杠 | HALT-AND-VERIFY 协议 |
|-------|----------------------|
| `/taiyi:continue` | 必须在运行前展示 engineTruth 当前阶段 + 即将执行的命令。**不跳过审核**。 |
| `/taiyi:commit` | 1. 跑 `commit-trailers` → 2. 展示建议 commit message + 变更摘要 → 3. **等待用户明确确认** → 4. 跑 `commit` |
| `/taiyi:ship` | 1. 展示 PR diff 摘要 + 涉及的阶段 → 2. **等待用户确认** |
| `/taiyi:archive` | 1. 展示归档 slug 名称 + 最终变化 → 2. 确认后执行 |

所有修改 git 历史 / 推送 / 部署的操作：**展示完整计划并等待 `"go ahead"` 或 `"yes"` 才执行。**

## Token 纪律

| # | 动作 |
|---|------|
| 1 | **清 slug** — archive / `cancel --remove-dir`；只保留 1 个 active |
| 2 | **archive 闭环** — integration 后立刻 archive |
| 3 | **compress** — `/taiyi:token compress <slug>` → 读 `CONTEXT-COMPACT.md` |
| 4 | **E2E 别在对话跑** — CI/后台；聊天只写 TEST.md 摘要 |

细节：Skill **`taiyi-compress`** · [`docs/taiyi/control-plane.md`](../../docs/taiyi/control-plane.md)

## 异常处理

| 情况 | 协议 |
|------|------|
| `continue` 返回非零 | 读错误输出 → 确认是前阶段门禁失败还是引擎错误。门禁失败：展示缺少什么 → 让用户决定回退。引擎错误：上报用户。 |
| 对话历史状态与 engineTruth 不符 | **始终信任 engineTruth**。重新初始化当前阶段上下文，丢弃早前推断。 |
| Agent 自动重试 | 最多 1 次自动重试。第二次失败必须等用户指令。 |

## Agent 代跑

```bash
scripts/taiyi-forge.sh <cmd> ...
```

示例：`/taiyi:continue` → `taiyi-forge.sh continue [slug] [--approver 名]`
