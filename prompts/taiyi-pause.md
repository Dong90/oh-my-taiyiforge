---
description: "TaiyiForge /taiyi:pause — pause and write HANDOFF.md for next session"
argument-hint: "optional slug and note"
---
User invoked **$taiyi-pause** (= `/taiyi:pause`). Run:

```bash
scripts/taiyi-forge.sh pause $ARGUMENTS
```

Writes `.taiyi/changes/<slug>/HANDOFF.md` with current phase snapshot. **Does not complete any phase.** Omit slug when only one active change.

After pause, tell the user to resume with `/taiyi:pause --resume` or `/taiyi:status` in the next session.

Use `--resume` flag to restore from HANDOFF: `scripts/taiyi-forge.sh resume $ARGUMENTS`

{{TAIYI_STAGE_PROTOCOL}}
