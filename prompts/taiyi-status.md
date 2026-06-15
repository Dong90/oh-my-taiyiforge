---
description: "TaiyiForge /taiyi:status — phase progress (e.g. design 3/9)"
argument-hint: "optional slug"
---
User invoked **$taiyi-status** (= `/taiyi:status`). Run:

```bash
scripts/taiyi-forge.sh status $ARGUMENTS --json --compact
```

Parse **`engineTruth`** (phase, skill, artifact, qualityReady, nextAction, blockers). **Trust this over chat memory.** Omit slug when only one active change.

Human-readable summary (user asks explicitly): `scripts/taiyi-forge.sh status $ARGUMENTS` or `--compact` without `--json`.

MCP alternative: `taiyi_state_get_status`.

{{TAIYI_STAGE_PROTOCOL}}
