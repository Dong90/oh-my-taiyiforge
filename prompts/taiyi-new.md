---
description: "TaiyiForge /taiyi:new — start a change (OpenSpec opsx:new)"
argument-hint: "change title, e.g. 用户登录"
---
User invoked **$taiyi-new** (= `/taiyi:new`). Run from project root:

```bash
scripts/taiyi-forge.sh new $ARGUMENTS
```

Creates `.taiyi/changes/<slug>/` with `--auto`. Show stdout/stderr. Then load `taiyi-change` for artifacts.
