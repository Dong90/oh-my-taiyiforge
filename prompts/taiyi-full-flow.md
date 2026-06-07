---
description: "TaiyiForge /taiyi:full-flow — 九阶段 × Superpowers × 全部开源外挂完整串联"
argument-hint: "[slug]"
---
User invoked **$taiyi-full-flow** (= `/taiyi:full-flow`). Run the **complete open-source workflow**: Superpowers 14 skills + gstack + OpenSpec + web-quality + Playwright + Semgrep + Trivy + Changesets + taiyi auxiliary skills.

## Read first

- `docs/taiyi/full-oss-flow.md` — step-by-step script per phase
- `docs/taiyi/workflow-manifest.yaml` — 单一真源（阶段 · Skill · harness · 门禁 · profile）

## Current change

```bash
scripts/taiyi-forge.sh status $ARGUMENTS
scripts/taiyi-forge.sh harness $ARGUMENTS
```

## Your job (Agent)

For **each phase** until integration complete:

1. Run `harness <slug>` — execute **every** hook in order (§1 iron triangle → §2 auxiliary → §3 main Skill).
2. **Load** each Superpowers / gstack / web-quality Skill in chat (not shell-only for Agent skills).
3. **Run** CLI hooks when present: `openspec`, `playwright`, `semgrep`, `trivy`, `changeset`.
4. **Write** taiyi-* artifacts to quality-ready.
5. **Checkpoint**: `scripts/taiyi-forge.sh harness-check <slug> <key>` for each hook you executed.
6. **Advance**: `/taiyi:continue` (planning) or `/taiyi:apply` (dev/test) or `complete <phase>`.

## Phase cheat sheet

| Phase | Superpowers | OSS extras | taiyi Skill |
|-------|-------------|------------|-------------|
| change | brainstorming | — | taiyi-change (+ intel-scan) |
| requirement | writing-plans | openspec | taiyi-requirement |
| design | — | gstack plan-eng-review | taiyi-design (+ architect) |
| ui-design | — | gstack plan-design-review · web-quality | taiyi-ui-design |
| task | writing-plans + TDD | — | taiyi-task · `/taiyi:tdd plan` |
| dev | TDD (+ subagent optional) | — | taiyi-dev · `/taiyi:tdd dev` |
| test | verification | gstack qa · playwright · web-quality | taiyi-test |
| review | requesting-code-review | gstack review · semgrep · trivy | taiyi-review · `/taiyi:health` |
| integration | finishing-a-development-branch + verification | gstack document-release · openspec · changesets | taiyi-integration · `/taiyi:audit` |

Then `/taiyi:archive`.

## Install reminder

```bash
npx taiyi-forge-install --all
npx taiyi doctor
```

Optional CLI missing → skip that hook with note; **do not block** on optional hooks (engine allows complete).
