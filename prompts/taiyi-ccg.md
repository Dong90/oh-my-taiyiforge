---
description: "TaiyiForge /taiyi:ccg — 多模型合成 lane（对标 OMC ccg）"
argument-hint: "[slug]"
---
User invoked **$taiyi-ccg** (= `/taiyi:ccg`).

```bash
scripts/taiyi-forge.sh ccg $ARGUMENTS
```

Codex + Gemini + Claude 合成方案 → 写入 DESIGN/TASK → `/taiyi:continue`. 宿主内执行 consult，非 npm 内置 spawn。
