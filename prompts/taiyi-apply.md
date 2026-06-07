---
description: "TaiyiForge /taiyi:apply — implement (OpenSpec opsx:apply)"
argument-hint: "optional slug"
---
User invoked **$taiyi-apply** (= `/taiyi:apply`). Run:

```bash
scripts/taiyi-forge.sh apply $ARGUMENTS
```

For dev/test phases: show implementation harness + next steps.

- **dev**: load `taiyi-dev` + Superpowers `test-driven-development` (or `/taiyi:tdd dev`)
- **test**: load `taiyi-test` + Superpowers `verification-before-completion`
- After tests pass, write `.dev-complete` with `command:` + `exitCode: 0` before `complete dev`
