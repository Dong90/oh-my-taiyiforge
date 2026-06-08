---
description: "TaiyiForge /taiyi:review — write REVIEW.md (phase review)"
argument-hint: "[slug]"
---
User invoked **$taiyi-review** (= `/taiyi:review`). **Write REVIEW.md** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh review $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-review`** Skill (`@taiyi-review`).
3. `/taiyi:health` · `/taiyi:security` · `/taiyi:review-loop`
4. Only edit `.taiyi/changes/<slug>/REVIEW.md` — **no business code** before dev.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue --approver "名字"`

{{TAIYI_STAGE_PROTOCOL}}
