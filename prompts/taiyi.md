---
description: "TaiyiForge slash router — map /taiyi:* to taiyi-forge.sh (canonical v30 surface)"
argument-hint: "any /taiyi:<verb> args"
---
User invoked TaiyiForge. Map `$ARGUMENTS` or the user's `/taiyi:*` to `scripts/taiyi-forge.sh`. **One slash per responsibility** — duplicates removed; legacy CLI verbs still work (see `docs/taiyi/commands.yaml` → `legacy_cli`).

## v30 顶栏（21 条）

| Slash | Shell |
|-------|-------|
| `/taiyi:plan` | `plan [file]` — 项目级规划：README/PRD/PDF/URL → 多个 change |
| `/taiyi:new` | `new` |
| `/taiyi:status` | `status` (add `--json` for machine/MCP) |
| `/taiyi:write` | `write` (nine-stage artifact writes) |
| `/taiyi:continue` | `continue` |
| `/taiyi:apply` | `apply` |
| `/taiyi:archive` | `archive` |
| `/taiyi:pause` | `pause` (恢复: `pause --resume`) |
| `/taiyi:cancel` | `cancel` |
| `/taiyi:list` | `list` |
| `/taiyi:verify` | `verify` (= `ci verify`) |
| `/taiyi:render` | `render [slug] [phase]` — json → md 强制同步 |
| `/taiyi:commit` | `commit-trailers` + git |
| `/taiyi:ship` | gstack `ship` |
| `/taiyi:land` | gstack `land-and-deploy` |
| `/taiyi:skill <name>` | 外部 Skill 路由（gstack · sp · explore · tdd · flow） |
| `/taiyi:token status\|record\|scan\|compress` | `token …` |
| `/taiyi:test smoke\|e2e\|qa\|ui\|security` | umbrellas: `test` |
| `/taiyi:review loop\|check\|health\|gstack` | umbrellas: `review` |
| `/taiyi:diagram pipeline\|c4\|arch\|render\|flow` | umbrellas: `diagram` |

## Legacy 兼容（已从顶栏移除 · 仍可用）

`/taiyi:doctor` · `/taiyi:audit` · `/taiyi:release` · `/taiyi:explore` · `/taiyi:flow` · `/taiyi:gstack <skill>` · `/taiyi:sp <skill>` · `/taiyi:mode …` · `/taiyi:workflow …` · `/taiyi:ralph` · `/taiyi:autopilot` · `/taiyi:team` · `/taiyi:ultrawork` · `/taiyi:agent` · `/taiyi:review-loop` · `/taiyi:review-check` · `/taiyi:health` · `/taiyi:step` · `/taiyi:stop-mode` · `/taiyi:external-context` · `/taiyi:resume` · `/taiyi:browser-smoke` · `/taiyi:e2e` · `/taiyi:ui-test` · `/taiyi:security` · `/taiyi:init` · `/taiyi:complete` · `/taiyi:check` (= harness) · `/taiyi:harness-check` · `/taiyi:mark-aux` · `/taiyi:assess` · `/taiyi:phases` · `/taiyi:sync` · `/taiyi:run` (= walkthrough) · `/taiyi:help` · `/taiyi:state` (= `status --json`)

## 引擎 CLI（脚本/CI 仍直接调用）

`pause --resume` · `commit-trailers` · `next` · `done` · `guide` · `change` · `requirement` · `design` · `ui-design` · `task` · `dev` · `test` · `review` · `integration` · `flow <scenario>` · `init` · `ci platform` · `ci verify` · `sync-openspec` · `prune --aborted`

详见 `docs/taiyi/commands.yaml` → `canonical_v30` + `legacy_slash`。
