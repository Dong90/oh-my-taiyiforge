---
description: "TaiyiForge /taiyi:status — phase progress (e.g. design 3/9)"
argument-hint: "optional slug"
---
User invoked **$taiyi-status** (= `/taiyi:status`). Run:

```bash
scripts/taiyi-forge.sh status $ARGUMENTS
```

Shows current phase, Skill, artifact readiness, sync actions, and next action. **Trust this output** over chat memory. Omit slug when only one active change.

For machine/MCP JSON: `scripts/taiyi-forge.sh status $ARGUMENTS --json` or MCP `taiyi_state_get_status`.

{{TAIYI_STAGE_PROTOCOL}}
