---
description: "TaiyiForge /taiyi:complete — complete a specific phase (explicit phase id)"
argument-hint: "<slug> <phase> [--approver 名]"
---
User invoked **$taiyi-complete** (= `/taiyi:complete`). Run:

```bash
scripts/taiyi-forge.sh complete $ARGUMENTS
```

Completes the named phase after artifact + gates pass. Daily prefer `/taiyi:continue`; use this when phase must be explicit (e.g. `complete my-slug review --approver "你"`).

{{TAIYI_STAGE_PROTOCOL}}
