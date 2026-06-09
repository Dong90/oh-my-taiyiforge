---
description: "TaiyiForge /taiyi:doctor — install + workspace workflow health"
---
User invoked **$taiyi-doctor**. Run from project root:

```bash
scripts/taiyi-forge.sh doctor --json --compact
# CI / 门禁：工作区 blocker 也须 PASS
scripts/taiyi-forge.sh doctor --strict-workspace --json --compact
```

Parse **`ok`**, **`failed[]`** (id + detail). Human summary: omit `--json` or add `--compact` only.

Checks **install** (skills, rules, commands) and **workspace workflow** (active slug, phase blockers, early code drift) — similar to OMC `omc-doctor` + active state.

Fix install failures: `npx taiyi-forge-install --all`

Fix workflow issues: `/taiyi:status --json --compact` · `/taiyi:audit --json --compact` · `/taiyi:handoff`
