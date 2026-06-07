---
description: "TaiyiForge /taiyi:state — engine truth JSON (MCP taiyi_state_get_status parity)"
argument-hint: "[slug]"
---
User invoked **$taiyi-state** (= `/taiyi:state`). Run:

```bash
scripts/taiyi-forge.sh status $ARGUMENTS --json
```

Returns `engineTruth` + structured status (same data as MCP `taiyi_state_get_status`). Humans prefer plain `/taiyi:status`; use this when Agent needs JSON without MCP.

{{TAIYI_STAGE_PROTOCOL}}
