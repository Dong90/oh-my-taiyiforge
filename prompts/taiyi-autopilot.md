---
description: "TaiyiForge /taiyi:autopilot — 想法 → 九阶段可运行代码（原生，不依赖 OMC）"
argument-hint: "[slug]"
---
User invoked **$taiyi-autopilot** (= `/taiyi:autopilot`). **Full Taiyi nine-phase autopilot — native, no OMC.**

```bash
scripts/taiyi-forge.sh autopilot $ARGUMENTS
```

## Prerequisites

- Active change slug (create with `/taiyi:new <title> --auto` or `init <slug> --auto`)
- **autoHarness** enabled (`--auto` or `TAIYI_AUTO_HARNESS=1`)

## Agent loop (each phase)

1. `scripts/taiyi-forge.sh harness <slug>` — iron triangle → aux → main Skill
2. Write phase artifact under `.taiyi/changes/<slug>/`
3. **dev/test:** `/taiyi:tdd dev` · `/taiyi:apply` · `/taiyi:ralph`
4. **review:** `/taiyi:review-loop` · `/taiyi:health`
5. `/taiyi:continue` (change/design/review need `--approver`)
6. Non-human gates: `/taiyi:loop`

## Delivery chain

`/taiyi:commit` → `/taiyi:verify` → `/taiyi:ship` → `/taiyi:land` → `/taiyi:archive`

Parallel roles: `/taiyi:team` · high throughput: `/taiyi:ultrawork`
