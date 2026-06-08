---
description: "TaiyiForge /taiyi:ui-test — UI QA shortcut (gstack qa + e2e)"
argument-hint: "[slug]"
---
User invoked **$taiyi-ui-test** (= `/taiyi:ui-test`). **UI testing** in test phase.

1. `scripts/taiyi-forge.sh status $ARGUMENTS`
2. Load **`taiyi-test`** + run **`/taiyi:gstack qa`** (site QA) and/or **`/taiyi:e2e`** (Playwright).
3. Record evidence in **TEST.md**; then `/taiyi:continue`.

Alias bundle: qa + e2e + verification-before-completion.

{{TAIYI_STAGE_PROTOCOL}}
