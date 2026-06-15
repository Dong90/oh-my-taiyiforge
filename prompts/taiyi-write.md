---
description: "TaiyiForge /taiyi:write — write current phase artifact"
argument-hint: "[slug]"
---
User invoked **$taiyi-write** (= `/taiyi:write`). **Write the current phase artifact** (engine picks Skill from status).

```bash
scripts/taiyi-forge.sh write $ARGUMENTS
```

Then load the **Skill** named in engine output (`@taiyi-*`). Nine-stage writes use this single slash; `@taiyi-change` … `@taiyi-integration` still work when loaded directly.

{{TAIYI_STAGE_PROTOCOL}}
