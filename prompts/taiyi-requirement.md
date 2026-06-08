---
description: "TaiyiForge /taiyi:requirement — write REQUIREMENT.md (phase requirement)"
argument-hint: "[slug]"
---
User invoked **$taiyi-requirement** (= `/taiyi:requirement`). **Write REQUIREMENT.md** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh requirement $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-requirement`** Skill (`@taiyi-requirement`).
3. Optional: `/taiyi:sp writing-plans` · OpenSpec `openspec change show <slug>`
4. Only edit `.taiyi/changes/<slug>/REQUIREMENT.md` — **no business code** before dev.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue`

{{TAIYI_STAGE_PROTOCOL}}
