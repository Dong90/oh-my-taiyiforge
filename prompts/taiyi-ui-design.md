---
description: "TaiyiForge /taiyi:ui-design — write UI-DESIGN.md (phase ui-design)"
argument-hint: "[slug]"
---
User invoked **$taiyi-ui-design** (= `/taiyi:ui-design`). **Write UI-DESIGN.md** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh ui-design $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-ui-design`** Skill (`@taiyi-ui-design`).
3. UI contract + a11y · `/taiyi:gstack plan-design-review`
4. Only edit `.taiyi/changes/<slug>/UI-DESIGN.md` — **no business code** before dev.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue`

{{TAIYI_STAGE_PROTOCOL}}
