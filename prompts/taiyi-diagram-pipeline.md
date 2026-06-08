---
description: "TaiyiForge /taiyi:diagram-pipeline — C4 → arch → PNG 三步流水线"
argument-hint: "[slug] [--repo] [--scope path] [--skip-render] [--review]"
---
User invoked **/taiyi:diagram-pipeline**. Load **`taiyi-diagram-pipeline`** and run **Steps 1→2→3 in order**.

Read first: `docs/diagrams/pipeline.md`

## Steps (do not skip order)

### 1 — `/taiyi:diagram-c4`

Load **taiyi-diagram-c4**. Output `diagrams/c4/` (change) or `docs/c4/` (`--repo`).
**Gate**: `containers.md` has renderable mermaid + Observed/Inferred sections.

### 2 — `/taiyi:diagram-arch`

Load **taiyi-diagram-arch**. Sync from Step 1 `containers.md` → `diagrams/architecture.md` (or `docs/diagrams/architecture.md`).
Add backlink: `> C4 真源：…/containers.md`. **Do not** redefine module boundaries.
`mark-aux taiyi-diagram-arch` (change-scoped).

### 3 — `/taiyi:diagram-render` (skip if `--skip-render`)

Load **taiyi-diagram-render**. SVG from Step 1 c4 mermaid → `c4/png/`; optional architecture → `diagrams/png/`.
`mark-aux taiyi-diagram-render` (change-scoped).

## Args

- `slug` — active change (infer if single)
- `--repo` — repo-level `docs/c4/` + `docs/diagrams/`
- `--scope path` — pass to Step 1 scan
- `--skip-render` — Steps 1–2 only
- `--review` — Step 3 visual review (slower)

## Finish

Report paths for C4, architecture.md, PNG dir, and mark-aux skills completed.

**Not a substitute for** `/taiyi:diagram-flow` (gates / nine-phase flows).
