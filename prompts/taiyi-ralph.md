---
description: "TaiyiForge /taiyi:ralph — 验证不过就修，直到 npm test（或 deliveryVerifyCmd）绿"
argument-hint: "[slug]"
---
User invoked **$taiyi-ralph** (= `/taiyi:ralph`). **Stay in Ralph mode until verify command passes.**

Kick off (activates ralph mode + runs one step):

```bash
scripts/taiyi-forge.sh ralph $ARGUMENTS
```

## Agent loop (mandatory — OMC ralph parity)

Repeat until engine reports verify passed:

1. **Debug** — `/taiyi:sp systematic-debugging` · `/taiyi:agent debugger`
2. **Fix** — minimal change · `/taiyi:sp test-driven-development` · `/taiyi:tdd dev`
3. **Re-run** — `scripts/taiyi-forge.sh step <slug>` (**do not claim done while exit ≠ 0**)
4. **Pass** → `/taiyi:continue` when phase artifacts + gates are ready

Cursor **stop hook** blocks ending the session while ralph is active. Say `stopomc` or `/taiyi:stop-mode` to exit.

**Forbidden:** ending the session while verify still fails.
