---
description: "TaiyiForge /taiyi:diagram-flow — 流程图（taiyi-diagram-flow Skill）"
argument-hint: "[slug] [flow-name]"
---
User invoked **/taiyi:diagram-flow**. Load **`taiyi-diagram-flow`** and produce flowcharts for the active change.

1. Read `REQUIREMENT.md` AC + `DESIGN.md` states/APIs (+ `TASK.md` if slicing).
2. Write `.taiyi/changes/<slug>/diagrams/flows.md` with main flow + traceability table; split `diagrams/flow-<name>.md` if >15 nodes.
3. Mark human/quality/delivery gates on decision nodes where relevant.
4. Optional PNG: `node scripts/render-mermaid.mjs diagrams/flows.md`
5. Link nodes in `TASK.md`; then `scripts/taiyi-forge.sh mark-aux <slug> taiyi-diagram-flow`

Use slug from args or infer single active change. Optional `flow-name` creates/updates `diagrams/flow-<name>.md`.
