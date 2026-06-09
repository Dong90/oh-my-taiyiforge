---
description: "TaiyiForge slash router — map /taiyi:* to taiyi-forge.sh (canonical slash surface)"
argument-hint: "any /taiyi:<verb> args"
---
User invoked TaiyiForge. Map `$ARGUMENTS` or the user's `/taiyi:*` to `scripts/taiyi-forge.sh`. **One slash per responsibility** — duplicates removed; legacy CLI verbs still work (see `docs/taiyi/commands.yaml` → `legacy_cli`).

| Slash | Shell |
|-------|-------|
| `/taiyi:new` | `new` |
| `/taiyi:init` | `init` |
| `/taiyi:status` | `status` (add `--json` for machine/MCP) |
| `/taiyi:continue` | `continue` |
| `/taiyi:complete` | `complete` |
| `/taiyi:apply` | `apply` |
| `/taiyi:archive` | `archive` |
| `/taiyi:cancel` | `cancel` |
| `/taiyi:handoff` | `handoff` |
| `/taiyi:write` | `write` (nine-stage artifact writes) |
| `/taiyi:list` | `list` |
| `/taiyi:check` | `check` (= harness) |
| `/taiyi:harness-check` | `harness-check` |
| `/taiyi:mark-aux` | `mark-aux` |
| `/taiyi:assess` | `assess` |
| `/taiyi:phases` | `phases` |
| `/taiyi:doctor` | `doctor` |
| `/taiyi:audit` | `audit` |
| `/taiyi:verify` | `verify` (= `ci verify`) |
| `/taiyi:health` | `health` |
| `/taiyi:sync` | `sync` |
| `/taiyi:run` | `walkthrough` |
| `/taiyi:loop` | `loop` |
| `/taiyi:review-loop` | `review-loop` |
| `/taiyi:review-check` | `review-check` |
| `/taiyi:token status\|record\|scan\|compress` | `token …` |
| `/taiyi:ci platform` | `ci platform` |
| `/taiyi:commit` | `commit-trailers` + git |
| `/taiyi:ship` | gstack `ship` |
| `/taiyi:land` | gstack `land-and-deploy` |
| `/taiyi:gstack review` | gstack `review` |
| `/taiyi:gstack qa` | gstack `qa` |
| `/taiyi:gstack <skill>` | any gstack Skill |
| `/taiyi:release` | gstack `document-release` |
| `/taiyi:sp <skill>` | any Superpowers Skill |
| `/taiyi:security` | semgrep + trivy |
| `/taiyi:e2e` | `npx playwright test` + verification |
| `/taiyi:resume` | HANDOFF.md + status |
| `/taiyi:help` | slash catalog |

Skill loaders: `/taiyi:explore` · `/taiyi:flow` · `/taiyi:full-flow` · `/taiyi:tdd` — see each prompt.

Run from project root. Full list: `docs/taiyi/commands.yaml` → `slash_catalog` + `canonical_commands`.
