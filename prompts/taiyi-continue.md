---
description: "TaiyiForge /taiyi:continue — advance workflow (OpenSpec opsx:continue)"
argument-hint: "optional slug"
---
User invoked **$taiyi-continue** (= `/taiyi:continue`). Run:

```bash
scripts/taiyi-forge.sh continue $ARGUMENTS
```

Completes current phase if gates pass; otherwise prints next-step guidance. Omit slug when only one active change.
