---
description: "TaiyiForge slash router — map any /taiyi:* to taiyi-forge.sh (100% slash surface)"
argument-hint: "any /taiyi:<verb> args"
---
User invoked TaiyiForge. **Every engine verb has a slash alias** — map `$ARGUMENTS` or the user's `/taiyi:*` to `scripts/taiyi-forge.sh`:

| Slash | Shell |
|-------|-------|
| `/taiyi:new` | `new` |
| `/taiyi:init` | `init` |
| `/taiyi:status` | `status` |
| `/taiyi:state` | `status --json` |
| `/taiyi:state-read` | read `.taiyi/changes/<slug>/state.json` after `/taiyi:list` |
| `/taiyi:continue` | `continue` |
| `/taiyi:complete` | `complete` |
| `/taiyi:done` | `done` (legacy) |
| `/taiyi:next` | `next` |
| `/taiyi:apply` | `apply` |
| `/taiyi:archive` | `archive` |
| `/taiyi:cancel` | `cancel` |
| `/taiyi:handoff` / `/taiyi:pause` | `handoff` |
| `/taiyi:list` | `list` |
| `/taiyi:check` | `check` (= harness) |
| `/taiyi:harness-check` | `harness-check` |
| `/taiyi:mark-aux` | `mark-aux` |
| `/taiyi:assess` | `assess` |
| `/taiyi:phases` | `phases` |
| `/taiyi:guide` | `guide --json` |
| `/taiyi:doctor` | `doctor` |
| `/taiyi:audit` | `audit` |
| `/taiyi:verify` | `verify` (= `ci verify`) |
| `/taiyi:health` | `health` |
| `/taiyi:sync` | `sync` |
| `/taiyi:run` | `walkthrough` |
| `/taiyi:loop` | `loop` |
| `/taiyi:review-loop` | `review-loop` |
| `/taiyi:review-check` | `review-check` |
| `/taiyi:commit-trailers` | `commit-trailers` |
| `/taiyi:token status\|record\|scan\|compress` | `token …` |
| `/taiyi:ci platform` | `ci platform` |
| `/taiyi:commit` | `commit-trailers` + git |
| `/taiyi:ship` | gstack `ship` |
| `/taiyi:land` | gstack `land-and-deploy` |
| `/taiyi:gstack review` | gstack `review` |
| `/taiyi:gstack qa` | gstack `qa` |
| `/taiyi:release` | gstack `document-release` |

No slash (chat-only): `/taiyi:explore` · `/taiyi:flow` · `/taiyi:full-flow` · `/taiyi:tdd` — load Skills per prompt.

Run from project root. Show stdout/stderr. Full list: `docs/taiyi/commands.yaml`.
