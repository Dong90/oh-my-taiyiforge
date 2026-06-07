---
description: "TaiyiForge /taiyi:commit-trailers — suggest commit message with Taiyi-Change trailer"
argument-hint: "[slug] [subject line]"
---
User invoked **$taiyi-commit-trailers** (= `/taiyi:commit-trailers`). Run:

```bash
scripts/taiyi-forge.sh commit-trailers $ARGUMENTS
```

Before integration: print commit message with `Taiyi-Change:` / `Taiyi-Phase:` trailers. User commits, then `/taiyi:continue` integration.
