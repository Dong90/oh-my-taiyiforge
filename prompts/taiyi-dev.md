---
description: "TaiyiForge /taiyi:dev — write code + `.dev-complete` (phase dev)"
argument-hint: "[slug]"
---
User invoked **$taiyi-dev** (= `/taiyi:dev`). **Write code + `.dev-complete`** for this change — load Skill, do not skip quality gates.

```bash
scripts/taiyi-forge.sh dev $ARGUMENTS
```

## Agent steps

1. Run engine command — confirm slug + phase match (fix with `/taiyi:status` if mismatch).
2. Load **`taiyi-dev`** Skill (`@taiyi-dev`).
3. Use `/taiyi:tdd dev` · `/taiyi:apply` · `/taiyi:ralph` — **may edit src/**
4. Implement with TDD; write `.dev-complete` with `command:` + `exitCode: 0`.
5. `scripts/taiyi-forge.sh status <slug>` — quality ready → `/taiyi:continue`

{{TAIYI_STAGE_PROTOCOL}}
