---
description: "TaiyiForge /taiyi:cancel — abort active change"
argument-hint: "optional slug"
---
User invoked **$taiyi-cancel** (= `/taiyi:cancel`). Run:

```bash
scripts/taiyi-forge.sh cancel $ARGUMENTS
```

Marks the change **aborted** (no longer counts as active). Does **not** delete `.taiyi/changes/<slug>/`. Omit slug when only one active change.

**STOP after showing output.** Do not edit artifacts or run continue.

{{TAIYI_STAGE_PROTOCOL}}
