---
description: "TaiyiForge /taiyi:explore — codebase intelligence scan (phase shortcut)"
argument-hint: "[optional context]"
---
User invoked **$taiyi-explore** (= `/taiyi:explore`). Run codebase intelligence before change:

```bash
scripts/taiyi-forge.sh intel-scan [slug]  # 若无 slug 则扫描全库
```

Produces `.taiyi/changes/<slug>/CONTEXT.md` (or `.taiyi/intel/` for ad-hoc). Used before `/taiyi:new` or when entering an unfamiliar module.

{{TAIYI_STAGE_PROTOCOL}}
