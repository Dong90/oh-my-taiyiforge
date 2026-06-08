---
description: "TaiyiForge /taiyi:integration — write CHANGELOG.md (phase integration)"
argument-hint: "[slug]"
---
User invoked **$taiyi-integration** (= `/taiyi:integration`). **Write CHANGELOG.md** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh integration $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-integration`** Skill (`@taiyi-integration`).
3. `/taiyi:commit` · `/taiyi:verify` before continue integration
4. Only edit `.taiyi/changes/<slug>/CHANGELOG.md` — **no business code** before dev.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue`

{{TAIYI_STAGE_PROTOCOL}}
