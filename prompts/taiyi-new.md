---
description: "TaiyiForge /taiyi:new — start a change (OpenSpec opsx:new)"
argument-hint: "change title, e.g. 用户登录"
---
User invoked **$taiyi-new** (= `/taiyi:new`). Run from project root:

```bash
scripts/taiyi-forge.sh new $ARGUMENTS
```

Creates `.taiyi/changes/<slug>/` and **only seeds CHANGE.md** (not all nine phases). Default is **manual** nine-phase mode; add `--auto` only when user wants full autopilot.

**STOP after showing output.** Do NOT install deps, edit source code, write future phase artifacts, or run `/taiyi:continue` until the user asks.

When the user asks to fill CHANGE: load `taiyi-change`, edit only `CHANGE.md`, then run `status`. After user confirms, run `continue --approver <name>`.

{{TAIYI_STAGE_PROTOCOL}}
