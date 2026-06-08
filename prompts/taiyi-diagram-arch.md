---
description: "TaiyiForge /taiyi:diagram-arch — 架构图（taiyi-diagram-arch Skill）"
argument-hint: "[slug] [topic]"
---
User invoked **/taiyi:diagram-arch**. Load **`taiyi-diagram-arch`** — **pipeline Step 2** (sync from C4 truth).

1. **If** `diagrams/c4/containers.md` or `docs/c4/containers.md` exists → use as **source of truth**; do not redefine modules.
2. Read `REQUIREMENT.md` + `DESIGN.md` (+ `CONTEXT.md` if present).
3. Write `.taiyi/changes/<slug>/diagrams/architecture.md` (or `docs/diagrams/architecture.md` for `--repo`) with backlink to C4 source.
4. PNG is **Step 3**: `/taiyi:diagram-render` or full `/taiyi:diagram-pipeline` — not required here.
5. Repo product poster: `python3 scripts/generate-architecture-svg.py` (separate from this pipeline).
6. `scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-arch` when `diagrams/architecture.md` is substantive.

Use slug from args or infer single active change. Optional `topic` narrows scope (e.g. `deployment`, `auth`).
