---
description: "TaiyiForge /taiyi:stop-mode — 停止 ralph/autopilot/team/ultrawork 等运行时模式（对标 OMC cancel skill）"
argument-hint: "[--force] [slug]"
---
User invoked **$taiyi-stop-mode** (= `/taiyi:stop-mode`). Cancel active **runtime modes**, not the change slug.

```bash
scripts/taiyi-forge.sh stop-mode $ARGUMENTS
```

- Default: stop modes for current session / active slug
- `--force` / `--all`: clear all `.taiyi/runtime/*-mode.json`
- To **abort a change** use `/taiyi:cancel` instead

Keywords: `stopomc`, `cancelomc` → this command.
