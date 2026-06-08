---
description: "TaiyiForge /taiyi:agent — 29 个原生专 Agent 角色（自 OMC 迁移）"
argument-hint: "<role|list> [slug]"
---
User invoked **$taiyi-agent** (= `/taiyi:agent`). **Load a native specialist agent role — no OMC.**

```bash
scripts/taiyi-forge.sh agent $ARGUMENTS
```

List roles: `scripts/taiyi-forge.sh agent list`

## Agent actions

1. Run engine command — follow **load** list (taiyi-* Skills, `/taiyi:sp`, `/taiyi:gstack`, slash shortcuts)
2. Write output to `.taiyi/changes/<slug>/` current phase artifact
3. Finish with `/taiyi:continue` or verification loops (`/taiyi:ralph`, `/taiyi:review-loop`)

Roles include: explore, analyst, planner, architect, designer, executor, debugger, test-engineer, verifier, tracer, security-reviewer, code-reviewer, qa-tester, writer, git-master, code-simplifier, critic, scientist, document-specialist, style-reviewer, api-reviewer, performance-reviewer, dependency-expert, quality-strategist, product-manager, ux-researcher, information-architect, product-analyst, vision.

See `docs/taiyi/agent-roles.yaml` for phase defaults (generated from `src/core/agent-roles.ts` via `node scripts/sync-agent-roles-yaml.mjs`).

Optional hard gate: `TAIYI_AGENT_STRICT_PHASE=1` blocks roles outside recommended phases (default is warn-only ⚠️).
