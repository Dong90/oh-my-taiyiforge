---
description: "TaiyiForge /taiyi:change — write CHANGE.md (phase change)"
argument-hint: "[slug]"
---
User invoked **$taiyi-change** (= `/taiyi:change`). **Write CHANGE.md** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh change $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-change`** Skill (`@taiyi-change`).
3. Optional first: `/taiyi:explore` (brainstorming) · `@taiyi-intel-scan` → CONTEXT.md
4. Only edit `.taiyi/changes/<slug>/CHANGE.md` — **no business code** before dev.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue --approver "名字"`

{{TAIYI_STAGE_PROTOCOL}}
