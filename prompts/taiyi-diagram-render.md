---
description: "TaiyiForge /taiyi:diagram-render — Mermaid → SVG（taiyi-diagram-render Skill）"
---

User invoked **/taiyi:diagram-render**. Load **`taiyi-diagram-render`** (optional: **diagramming-architecture** render-only).

## Scope

- **Do not** rescan codebase or change component boundaries.
- Read upstream mermaid from Step 1/2 only.

## Paths

| Source | Output |
|--------|--------|
| `c4/context.md` + `c4/containers.md` | `c4/png/*.svg` |
| `diagrams/architecture.md` | `diagrams/png/*.svg` (optional; never into `c4/png/`) |

`--repo` → `docs/c4/` + `docs/diagrams/` prefixes.

## Steps

1. Agent runs (do not ask user to type):

```bash
node scripts/render-mermaid.mjs <c4/context.md> --format svg --out <c4/png-dir>/
node scripts/render-mermaid.mjs <c4/containers.md> --format svg --out <c4/png-dir>/
```

2. Optionally render `architecture.md` to `diagrams/png/`.
3. Change-scoped: `scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-render` when `diagrams/c4/png/context.svg` exists.

Export defaults & Chrome fix: `docs/diagrams/pipeline.md`.
