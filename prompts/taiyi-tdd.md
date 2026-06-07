---
description: "TaiyiForge /taiyi:tdd — Superpowers TDD（task 计划 / dev 执行）"
argument-hint: "[plan|dev] [slug]"
---
User invoked **$taiyi-tdd** (= `/taiyi:tdd`). TDD discipline aligned with **taiyi-task** (plan) and **taiyi-dev** (implement).

## Mode

- **`plan`** (default): current phase is **task** — load **Superpowers `test-driven-development`** + **`taiyi-task`**. For each slice T*, specify: test file path, failing test name, and `Done when` command (e.g. `npm test -- slice-1`).
- **`dev`**: current phase is **dev** — load **Superpowers `test-driven-development`** + **`taiyi-dev`**. RED → GREEN → REFACTOR per slice; run tests before claiming done.

Parse `$ARGUMENTS`: first token `plan` or `dev` selects mode; optional slug after.

## Engine context

```bash
scripts/taiyi-forge.sh status $ARGUMENTS
scripts/taiyi-forge.sh apply $ARGUMENTS
```

## After TDD session

1. Write/update **TASK.md** (plan) or code + **`.dev-complete`** (dev):
   ```text
   command: npm test
   exitCode: 0
   dev complete
   ```
2. Auto harness: `scripts/taiyi-forge.sh harness-check <slug> superpowers/test-driven-development`
3. Dev done: `scripts/taiyi-forge.sh complete <slug> dev` (or test → `complete test`)

See `docs/taiyi/tdd-workflow.md`.
