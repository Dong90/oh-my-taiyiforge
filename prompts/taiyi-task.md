---
description: "TaiyiForge /taiyi:task — write TASK.md (phase task)"
argument-hint: "[slug]"
---
User invoked **$taiyi-task** (= `/taiyi:task`). **Write TASK.md** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh task $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-task`** Skill (`@taiyi-task`).
3. Use `/taiyi:tdd plan` · bite-sized PR slices
4. Only edit `.taiyi/changes/<slug>/TASK.md` — **no business code** before dev.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue`

{{TAIYI_STAGE_PROTOCOL}}
