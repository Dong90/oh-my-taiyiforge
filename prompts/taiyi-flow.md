---
description: "TaiyiForge /taiyi:flow — Superpowers 主轴九阶段流程"
argument-hint: "[slug]"
---
User invoked **$taiyi-flow** (= `/taiyi:flow`). **Superpowers 全技能主轴**九阶段流程；外部开源 Skill/CLI 为可选外挂。

## Read

- `docs/taiyi/superpowers-flow.md`
- `docs/taiyi/workflow-manifest.yaml`

## Current change

```bash
scripts/taiyi-forge.sh status $ARGUMENTS
```

Status includes **Superpowers · 外挂 · 辅助 · harness** from `workflow-manifest.yaml`.

## Superpowers per phase (summary)

| Phase | Load Superpowers |
|-------|------------------|
| change | brainstorming (`/taiyi:explore`) |
| requirement | writing-plans (optional) |
| task | writing-plans + test-driven-development (`/taiyi:tdd plan`) |
| dev | test-driven-development (`/taiyi:tdd dev`); optional subagent/parallel/worktrees |
| test | verification-before-completion |
| review | requesting-code-review (`/taiyi:review-loop`); optional receiving-code-review |
| integration | finishing-a-development-branch + verification-before-completion |

## External (optional)

gstack · OpenSpec · web-quality-skills — see `workflow-manifest.yaml` → `external_skills`.

## Auto harness

After each Superpowers session: `scripts/taiyi-forge.sh harness-check <slug> superpowers/<skill>`

Then `/taiyi:continue` or `/taiyi:apply` (dev/test).
