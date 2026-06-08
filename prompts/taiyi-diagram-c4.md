---
description: "TaiyiForge /taiyi:diagram-c4 — C4 架构真源（taiyi-diagram-c4 Skill）"
argument-hint: "[slug] [--repo] [--scope path]"
---
User invoked **/taiyi:diagram-c4**. Load **`taiyi-diagram-c4`** (optional external: **c4-codebase-architecture**).

## Scope

- **Change** (default): `.taiyi/changes/<slug>/diagrams/c4/README.md` + `containers.md` [+ `context.md`]
- **Repo** (`--repo` or no slug): `docs/c4/README.md` + `docs/c4/containers.md`
- **Narrow scan**: `--scope src/core` (or arg path)

## Agent steps

1. Read `REQUIREMENT.md` / `DESIGN.md` / `CONTEXT.md` if change-scoped.
2. Scan codebase evidence (entrypoints, manifests, `src/`, infra) — **Observed vs Inferred** separate.
3. Write C4 mermaid in `containers.md`; README with Scope + Open questions.
4. **Do not** export PNG here (Step 3 is `/taiyi:diagram-render`).
5. Change-scoped: `scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-c4`

Next in pipeline: `/taiyi:diagram-arch` → `/taiyi:diagram-render` · Or run `/taiyi:diagram-pipeline`.
