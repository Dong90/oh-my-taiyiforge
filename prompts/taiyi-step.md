---
description: "TaiyiForge /taiyi:step — OMC 式单步驱动（ralph/autopilot/ultraqa 活跃模式）"
argument-hint: "[slug] [--mode ralph|autopilot|ultraqa|team|ultrawork]"
---
User invoked **$taiyi-step** (= `/taiyi:step`). **Run one orchestration step** for the active mode (OMC loop parity).

```bash
scripts/taiyi-forge.sh step $ARGUMENTS
```

## Agent loop (mandatory while mode active)

1. Run `step` — engine decides: ralph verify · autopilot continue · harness blockers
2. If `ralph-fix` → debug · fix · **step again** (do not end session)
3. If `harness` → load phase Skill · write artifacts · **step again**
4. If `done` → `/taiyi:archive` · `/taiyi:stop-mode`

Stop hook will reinforce if you try to finish early. Keywords `ralph` / `autopilot` auto-activate via hook after `npx taiyi-forge-install --cursor` or `--claude`. Codex: use `$taiyi-preflight` / `codex-keyword-preflight.mjs`.
