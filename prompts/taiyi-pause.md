---
description: "TaiyiForge /taiyi:pause — alias for handoff (pause and write HANDOFF.md)"
argument-hint: "optional slug and note"
---
User invoked **/taiyi:pause** (= `/taiyi:handoff`). Run:

```bash
scripts/taiyi-forge.sh handoff $ARGUMENTS
```

Writes `.taiyi/changes/<slug>/HANDOFF.md` with current phase snapshot. **Does not complete any phase.** Omit slug when only one active change.

After handoff, tell the user to resume with `/taiyi:resume` or `/taiyi:status` in the next session.

{{TAIYI_STAGE_PROTOCOL}}
