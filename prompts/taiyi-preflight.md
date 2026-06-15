---
description: "TaiyiForge $taiyi-preflight — Codex 关键词 + 模式提醒（无 hook 替代）"
argument-hint: "<user message>"
---
User invoked **$taiyi-preflight** (= `/taiyi:preflight`). Codex has no keyword/stop hook — run this discipline each turn.

```bash
node node_modules/oh-my-taiyiforge/scripts/codex-keyword-preflight.mjs "$ARGUMENTS"
```

Before **ending turn**:

```bash
node node_modules/oh-my-taiyiforge/scripts/codex-mode-reminder.mjs
# if output → scripts/taiyi-forge.sh step
```

Equivalent: `scripts/taiyi-forge.sh keyword "$ARGUMENTS"` · `/taiyi:keyword` · `modes` · `step`.
