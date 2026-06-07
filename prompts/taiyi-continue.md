---
description: "TaiyiForge /taiyi:continue — advance workflow (OpenSpec opsx:continue)"
argument-hint: "optional slug"
---
User invoked **$taiyi-continue** (= `/taiyi:continue`). Run:

```bash
scripts/taiyi-forge.sh continue $ARGUMENTS
```

**Attempts to complete the current phase** (quality + harness + human gates). Does not write artifacts. On failure, prints blockers and next-step guidance. Omit slug when only one active change.
