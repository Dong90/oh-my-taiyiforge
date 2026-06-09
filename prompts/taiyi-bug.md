---
description: "TaiyiForge /taiyi:bug — bugfix playbook (lite profile)"
argument-hint: "[title or slug]"
---
User invoked **$taiyi-bug** (= `/taiyi:bug`). **Bugfix scenario** — `--profile lite` (skips design/ui-design/task/review).

```bash
scripts/taiyi-forge.sh bug $ARGUMENTS
```

Create with `/taiyi:new <描述> --profile lite`. Each phase: **`/taiyi:write`**. Path: change → requirement → dev → test → integration. No REVIEW.md / review-loop.

{{TAIYI_STAGE_PROTOCOL}}
