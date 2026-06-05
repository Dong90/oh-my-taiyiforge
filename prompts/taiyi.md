---
description: "TaiyiForge OpenSpec-style router — prefer $taiyi-new, $taiyi-continue, $taiyi-apply, $taiyi-archive"
argument-hint: "legacy: subcommand args"
---
Prefer dedicated prompts: **$taiyi-new**, **$taiyi-continue**, **$taiyi-apply**, **$taiyi-archive** (= `/taiyi:new` … in Cursor).

If user sent a generic `$taiyi` with args, map:
- `new <title>` → `taiyi-forge.sh new …`
- `continue` → `taiyi-forge.sh continue …`
- `apply` → `taiyi-forge.sh apply …`
- `archive` → `taiyi-forge.sh archive …`

Run `scripts/taiyi-forge.sh` from project root. Show stdout/stderr.
