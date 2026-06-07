---
description: "TaiyiForge /taiyi:state-read — raw state.json (MCP taiyi_state_read parity)"
argument-hint: "[slug]"
---
User invoked **$taiyi-state-read** (= `/taiyi:state-read`). Run:

```bash
# No dedicated CLI — use status --json engineTruth or read file after list
scripts/taiyi-forge.sh status ${ARGUMENTS:-} --json
```

If user needs raw disk JSON: read `.taiyi/changes/<slug>/state.json` after resolving slug via `/taiyi:list`. MCP `taiyi_state_read` is equivalent for Cursor agents.
