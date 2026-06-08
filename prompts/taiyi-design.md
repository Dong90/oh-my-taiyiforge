---
description: "TaiyiForge /taiyi:design — write DESIGN.md (phase design)"
argument-hint: "[slug]"
---
User invoked **$taiyi-design** (= `/taiyi:design`). **Write DESIGN.md** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh design $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-design`** Skill (`@taiyi-design`).
3. ≥2 options · `@taiyi-architect` · `/taiyi:gstack plan-eng-review`
4. Only edit `.taiyi/changes/<slug>/DESIGN.md` — **no business code** before dev.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue --approver "名字"`

{{TAIYI_STAGE_PROTOCOL}}
