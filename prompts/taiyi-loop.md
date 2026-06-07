---
description: "TaiyiForge /taiyi:loop — 循环 continue 直到九阶段完成或当前阶段阻塞"
argument-hint: "[slug] [xN]"
---
User invoked **$taiyi-loop** (= `/taiyi:loop`). Run:

```bash
scripts/taiyi-forge.sh loop $ARGUMENTS
```

Loops `continue` up to N times (default 20, or `xN` suffix). **Does not write artifacts or code** — when blocked, load the current phase Skill, fill artifacts / implement, then invoke `/taiyi:loop` again. Human-gate phases (change/design/review) always block until `--approver`.

Repeat suffix also works: `/taiyi:continue x3` · `/taiyi:apply x2` · `/taiyi:check x2`.
