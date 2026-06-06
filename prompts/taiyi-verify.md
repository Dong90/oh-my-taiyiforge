---
description: "TaiyiForge /taiyi:verify — PR/CI artifact gate (no LLM)"
argument-hint: "optional slug; add --require-complete for integration done"
---
User invoked **$taiyi-verify** (= `/taiyi:verify`). Run:

```bash
scripts/taiyi-forge.sh verify $ARGUMENTS
# 等价（CI 脚本沿用）: scripts/taiyi-forge.sh ci verify --slug <slug>
```

校验 `.taiyi/changes/` 工件质量与 auto harness 阻塞（无 LLM）。PR 合并前使用。

对照：`/taiyi:audit` = 交付漂移+git · `/taiyi:verify` = 工件+门禁 · `/taiyi:doctor` = 安装
