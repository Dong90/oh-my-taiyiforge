---
description: "TaiyiForge /taiyi:ultrawork — task/dev 高吞吐并行切片（原生）"
argument-hint: "[slug]"
---
User invoked **$taiyi-ultrawork** (= `/taiyi:ultrawork`). **High-throughput parallel slices — native ultrawork.**

```bash
scripts/taiyi-forge.sh ultrawork $ARGUMENTS
```

**Only for task or dev phase.** If blocked, `/taiyi:continue` first.

## Protocol

1. Read **TASK.md** independent slices (each slice = potential PR)
2. `/taiyi:sp dispatching-parallel-agents` — one subagent per slice
3. `/taiyi:sp subagent-driven-development` — coordinator session only
4. Per slice: `/taiyi:tdd dev` → `/taiyi:ralph` until green
5. All slices green → `/taiyi:continue`

**Rules:** no shared dirty state across slices; each slice needs test evidence.
