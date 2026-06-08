---
description: "TaiyiForge /taiyi:team — plan → exec → verify → fix 多 Agent 泳道（原生）"
argument-hint: "[slug]"
---
User invoked **$taiyi-team** (= `/taiyi:team`). **Native team pipeline — no OMC.**

```bash
scripts/taiyi-forge.sh team $ARGUMENTS
```

Engine maps **current phase → lane**:

| Lane | Phases | Focus |
|------|--------|--------|
| **plan** | change … task | explore · requirements · design · TASK.md |
| **exec** | dev | ultrawork · parallel subagents · TDD |
| **verify** | test · review · integration | e2e · qa · security · review-loop |
| **fix** | dev/test/review failures | debugger → ralph / review-loop |

## Agent actions

1. Run engine command above — read recommended `/taiyi:agent <role>` for this phase
2. Dispatch parallel work: `/taiyi:sp dispatching-parallel-agents`
3. Still advance workflow only via `/taiyi:continue` (engine truth)
