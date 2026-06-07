---
description: "TaiyiForge /taiyi:handoff — pause and write HANDOFF.md for next session"
argument-hint: "optional slug and note"
---
User invoked **$taiyi-handoff** (= `/taiyi:handoff` or `/taiyi:pause`). Run:

```bash
scripts/taiyi-forge.sh handoff $ARGUMENTS
```

Writes `.taiyi/changes/<slug>/HANDOFF.md` with current phase snapshot. **Does not complete any phase.** Omit slug when only one active change.

After handoff, tell the user to resume with `/taiyi:status` in the next session.

{{TAIYI_STAGE_PROTOCOL}}
