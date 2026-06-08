---
description: "TaiyiForge /taiyi:ultraqa — QA 循环直到验收（对标 OMC ultraqa）"
argument-hint: "[slug]"
---
User invoked **$taiyi-ultraqa** (= `/taiyi:ultraqa`).

```bash
scripts/taiyi-forge.sh ultraqa $ARGUMENTS
```

Cycle: `/taiyi:gstack qa` · `/taiyi:e2e` · fix · `/taiyi:ralph` until AC met. Stop with `/taiyi:stop-mode`.
