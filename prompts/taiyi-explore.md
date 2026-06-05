---
description: "TaiyiForge /taiyi:explore — change 阶段头脑风暴（OpenSpec opsx:explore / OMX clarify）"
argument-hint: "optional change topic"
---
User invoked **$taiyi-explore** (= `/taiyi:explore`). No separate engine subcommand.

1. Load **Superpowers `brainstorming`** — clarify scope, risks, and success criteria before writing CHANGE.md.
2. Load **`taiyi-change`** — draft or refine `.taiyi/changes/<slug>/CHANGE.md`.
3. When brainstorming is done and `--auto` is on, run:
   ```bash
   scripts/taiyi-forge.sh harness-check <slug> superpowers/brainstorming
   ```
4. Then `/taiyi:continue` when CHANGE.md is quality-ready.

If user gave topic text in $ARGUMENTS, use it as the change title or CHANGE scope hint.
