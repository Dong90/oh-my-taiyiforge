---
description: "TaiyiForge /taiyi:keyword — OMC keyword-detector 斜杠（ralph/autopilot/team/ulw…）"
argument-hint: "<user message>"
---
User invoked **$taiyi-keyword** (= `/taiyi:keyword`). Scan user text for **OMC-compatible keywords** and map to `/taiyi:*` slashes.

```bash
scripts/taiyi-forge.sh keyword "$ARGUMENTS"
```

## When to use

| 端 | 用法 |
|----|------|
| **Cursor / Claude** | 通常由 **keyword hook** 自动注入；也可显式调本斜杠 |
| **Codex** | 无 hook → 每轮用 **`/taiyi:preflight`** 或本命令 |
| **OpenCode** | `taiyi_keyword` 工具（MCP 等价） |

## Detected keywords (examples)

`ralph` → `/taiyi:ralph` · `autopilot` → `/taiyi:autopilot` · `team` → `/taiyi:team` · `ulw`/`ultrawork` → `/taiyi:ultrawork` · `ralplan` → `/taiyi:ralplan` · `stopomc` → `/taiyi:stop-mode` · `deslop` → `/taiyi:ai-slop-cleaner` · `ccg` → `/taiyi:ccg`

After detection: run the suggested slash, then **`/taiyi:step`** while a mode is active.

{{TAIYI_STAGE_PROTOCOL}}
