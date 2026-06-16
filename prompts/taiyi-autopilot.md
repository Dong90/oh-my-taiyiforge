---
description: "TaiyiForge /taiyi:autopilot — 想法 → 九阶段可运行代码（原生，不依赖 OMC）"
argument-hint: "[slug]"
---
User invoked **$taiyi-autopilot** (= `/taiyi:autopilot`). **Full Taiyi nine-phase autopilot — native, no OMC.**

```bash
scripts/taiyi-forge.sh autopilot $ARGUMENTS
```

## Prerequisites (MUST check first)

1. Active change slug exists at `.taiyi/changes/<slug>/`
2. **autoHarness is ON** — slug was created with `--auto` (or `TAIYI_AUTO_HARNESS=1`).
   If `harness <slug>` reports autoHarness=false, **stop and tell the user** to recreate with `--auto`; do not loop, autopilot requires unattended execution.

## Agent loop (phase-driven, NOT a fixed 1→6 sequence)

Run `scripts/taiyi-forge.sh harness <slug>` first. Its output tells you:
- `currentPhase` — which of the 9 phases to run
- `gate` — `human` (needs `--approver`) or `auto` (no human)
- `pendingCommands` — commands relevant to this specific phase

Then **branch on phase** (do NOT run every step each iteration):

| Phase | Artifact | Step |
|-------|----------|------|
| 1 requirement | REQUIREMENT.md | write only |
| 2 design (human gate) | DESIGN.md | write → `/taiyi:continue --approver` |
| 3 change (human gate) | CHANGE.md | write → `/taiyi:continue --approver` |
| 4 test plan | TEST-PLAN.md | write only |
| 5 security | SECURITY.md | write only |
| 6 dev/test | (code + tests) | `/taiyi:tdd dev` → `/taiyi:apply` → `/taiyi:ralph` |
| 7 integration test | TEST.md evidence | `/taiyi:test` |
| 8 review (human gate) | REVIEW.md | `/taiyi:review-loop` → `/taiyi:health` → `/taiyi:continue --approver` |
| 9 integration/delivery | (merged) | `/taiyi:commit` → `/taiyi:verify` → `/taiyi:ship` → `/taiyi:land` → `/taiyi:archive` |

**Gate dispatch rule** (mutually exclusive, NOT sequential):
- `gate=human` (phases 2/3/8) → `/taiyi:continue --approver`
- `gate=auto` (phases 1/4/5/6/7) → `/taiyi:loop`

dev/test commands belong **only** to phase 6. review commands belong **only** to phase 8. delivery chain belongs **only** to phase 9. Running them in any other phase is a bug.

Parallel roles: `/taiyi:team` · high throughput: `/taiyi:ultrawork`
