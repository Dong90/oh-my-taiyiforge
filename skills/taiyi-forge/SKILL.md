---
name: taiyi-forge
description: TaiyiForge 引擎控制面 — 用户只说 /taiyi:* 斜杠，Agent 代跑 scripts/taiyi-forge.sh
---

# taiyi-forge（引擎 Skill）

## 原则

- **用户只说 `/taiyi:*`**（Codex：`$taiyi-*`）；你代跑 `scripts/taiyi-forge.sh`，禁止让用户手打 shell。
- 读状态默认：**`status [slug] --json --compact`** → 解析 **`engineTruth`**。
- 写工件 → **`/taiyi:write`**，再加载当前阶段 `taiyi-change` … `taiyi-integration` Skill。

## 主流程（仅这五条）

| 斜杠 | 引擎 |
|------|------|
| `/taiyi:new` | `new` |
| `/taiyi:status` | `status --json --compact` |
| `/taiyi:write` | `write` |
| `/taiyi:continue` | `continue` |
| `/taiyi:apply` | `apply`（dev/test） |
| `/taiyi:archive` | `archive` |

**其余斜杠**（doctor、audit、ralph、token、gstack 交付链等）→ [`docs/taiyi/canonical-commands.md`](../../docs/taiyi/canonical-commands.md) · [`docs/taiyi/commands.yaml`](../../docs/taiyi/commands.yaml)

## Token 纪律

| # | 动作 |
|---|------|
| 1 | **清 slug** — archive / `cancel --remove-dir`；只保留 1 个 active |
| 2 | **archive 闭环** — integration 后立刻 archive |
| 3 | **compress** — `/taiyi:token compress <slug>` → 读 `CONTEXT-COMPACT.md` |
| 4 | **E2E 别在对话跑** — CI/后台；聊天只写 TEST.md 摘要 |

细节：Skill **`taiyi-compress`** · [`docs/taiyi/control-plane.md`](../../docs/taiyi/control-plane.md)

## Agent 代跑

```bash
scripts/taiyi-forge.sh <cmd> ...
```

示例：`/taiyi:continue` → `taiyi-forge.sh continue [slug] [--approver 名]`
