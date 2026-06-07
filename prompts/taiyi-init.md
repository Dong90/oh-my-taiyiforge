---
description: "TaiyiForge /taiyi:init — fixed slug init (CI/scripts; daily prefer /taiyi:new)"
argument-hint: "<slug> [--profile api|lite|ui] [--auto] [--force] [--strict-dev]"
---
User invoked **$taiyi-init** (= `/taiyi:init`). Run:

```bash
scripts/taiyi-forge.sh init $ARGUMENTS
```

Creates `.taiyi/changes/<slug>/` with CHANGE.md seed. Default **manual** nine phases unless `--auto`. Daily work: prefer `/taiyi:new <标题>`.

{{TAIYI_STAGE_PROTOCOL}}
