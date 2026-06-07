---
description: "TaiyiForge /taiyi:continue — advance workflow (OpenSpec opsx:continue)"
argument-hint: "optional slug"
---
User invoked **$taiyi-continue** (= `/taiyi:continue`). Run:

```bash
scripts/taiyi-forge.sh continue $ARGUMENTS
```

**Attempts to complete the current phase** (quality + harness + human gates). Does not write artifacts. On failure, prints blockers and next-step guidance. Omit slug when only one active change.

**One phase per continue** — never skip ahead. If status shows「顺序冲突」or ahead-of-phase, delete future phase markdown files or finish the current phase first. Trust `status` over chat memory.

Human gates: `continue --approver "你的名字"` for change / design / review.

{{TAIYI_STAGE_PROTOCOL}}
