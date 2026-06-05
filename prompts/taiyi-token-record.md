---
description: "TaiyiForge /taiyi:token record — Agent 上报本轮 Token"
argument-hint: "<slug> <tokens> [--phase change] [--kind agent] [--label \"...\"]"
---
User invoked **$taiyi-token-record** (= `/taiyi:token record`). Run:

```bash
scripts/taiyi-forge.sh token record $ARGUMENTS
```

Records agent/scan token usage into `.taiyi/changes/<slug>/.token-usage.json`.
