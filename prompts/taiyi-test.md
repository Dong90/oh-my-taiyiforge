---
description: "TaiyiForge /taiyi:test — write TEST.md (phase test)"
argument-hint: "[slug]"
---
User invoked **$taiyi-test** (= `/taiyi:test`). **Write TEST.md** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh test $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-test`** Skill (`@taiyi-test`).
3. Run tests · `/taiyi:e2e` · `/taiyi:gstack qa` · verification-before-completion
4. Only edit `.taiyi/changes/<slug>/TEST.md` — **no business code** before dev.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue`

{{TAIYI_STAGE_PROTOCOL}}
